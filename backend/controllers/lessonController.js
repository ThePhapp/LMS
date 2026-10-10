const db = require('../config/db');
const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const {
  uploadPrivateFileToStorage,
  uploadDirectoryToStorage,
  deleteStoredFile,
  deleteStoragePrefix,
  deleteStorageKeys,
  packageEntryPath,
  packagePrefixFromLocator,
} = require('../config/storage');
const { issueFileTicket, PACKAGE_COOKIE_NAME } = require('../services/fileTickets');
const { extractPackageFromFile, cleanupPackage } = require('../utils/zipHandler');
const {
  CourseAccessError,
  parseId,
  requireCourseAccess,
  requireLessonAccess,
} = require('../services/courseAccess');

const tempUploadDir = path.resolve(__dirname, '../uploads/tmp');

function getFileType(originalname) {
  const ext = originalname.split('.').pop().toLowerCase();
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (ext === 'pdf') return 'pdf';
  if (['pptx', 'ppt'].includes(ext)) return 'pptx';
  if (['docx', 'doc'].includes(ext)) return 'docx';
  if (['xlsx', 'xls'].includes(ext)) return 'xlsx';
  if (ext === 'zip') return 'package';
  return 'document';
}

function isZipFile(originalname) {
  const ext = originalname.split('.').pop().toLowerCase();
  return ext === 'zip';
}

function packageValidationError(result) {
  const error = new Error(result.error);
  error.code = result.code;
  error.statusCode = result.statusCode;
  return error;
}

function sendControllerError(res, error) {
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const isExpectedClientError = statusCode >= 400 && statusCode < 500;
  const body = {
    message: isExpectedClientError ? error.message : 'Unable to save lesson',
  };
  if (isExpectedClientError && error.code) body.code = error.code;
  if (!isExpectedClientError) console.error('Lesson request failed');
  return res.status(statusCode).json(body);
}

function getLegacyLocalPackagePath(fileUrl) {
  if (typeof fileUrl !== 'string' || !fileUrl.startsWith('/packages/')) return null;

  const packageName = fileUrl.slice('/packages/'.length).split('/')[0];
  if (!packageName || packageName === '.' || packageName === '..') return null;

  const packagesRoot = path.resolve(__dirname, '../public/packages');
  const packagePath = path.resolve(packagesRoot, packageName);
  const relativePath = path.relative(packagesRoot, packagePath);
  if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    return null;
  }
  return packagePath;
}

async function cleanupLessonAsset(lesson) {
  if (!lesson?.file_url) return;
  if (lesson.file_type === 'package') {
    const localPackagePath = getLegacyLocalPackagePath(lesson.file_url);
    if (localPackagePath) {
      await cleanupPackage(localPackagePath);
      return;
    }
    const prefix = packagePrefixFromLocator(lesson.file_url);
    if (prefix) {
      await deleteStoragePrefix(prefix, { privateBucket: lesson.file_url.startsWith('r2://') });
    }
    return;
  }
  await deleteStoredFile(lesson.file_url);
}

async function validateChapterForCourse(chapterId, courseId) {
  if (chapterId === undefined || chapterId === null || chapterId === '') return null;
  const numericChapterId = Number(chapterId);
  if (!Number.isInteger(numericChapterId) || numericChapterId <= 0) {
    throw new CourseAccessError(400, 'Chapter ID must be a positive integer');
  }
  const [chapters] = await db.query(
    'SELECT id FROM chapters WHERE id = ? AND course_id = ?',
    [numericChapterId, courseId],
  );
  if (!chapters.length) {
    throw new CourseAccessError(400, 'Chapter does not belong to this course');
  }
  return numericChapterId;
}

async function processPackageUpload(uploadedFile) {
  const tempPackageDir = path.join(tempUploadDir, `lesson-pkg-${randomUUID()}`);
  let uploadedPackage = null;
  let operationError = null;

  try {
    const extractResult = await extractPackageFromFile(uploadedFile.path, tempPackageDir);
    if (!extractResult.success) throw packageValidationError(extractResult);

    const s3FolderPrefix = `packages/lesson-${randomUUID()}`;
    uploadedPackage = await uploadDirectoryToStorage(tempPackageDir, s3FolderPrefix);
    const relativeIndexPath = path
      .relative(tempPackageDir, extractResult.indexPath)
      .split(path.sep)
      .join('/');

    uploadedPackage.indexUrl = `${uploadedPackage.url}/${relativeIndexPath}`;
  } catch (error) {
    operationError = error;
  }

  try {
    await cleanupPackage(tempPackageDir);
  } catch (error) {
    operationError ||= error;
  }

  if (operationError) {
    if (uploadedPackage?.keys) await deleteStorageKeys(uploadedPackage.keys, { privateBucket: true });
    throw operationError;
  }

  return uploadedPackage;
}

exports.createLesson = async (req, res) => {
  let file_url = null, file_name = null, file_type = null;
  let packageUpload = null;
  let regularUploadLocator = null;

  try {
    const body = req.body || {};
    const { chapter_id, title, content, video_url, lesson_order, duration } = body;
    const courseId = parseId(body.course_id, 'Course ID');
    const [course] = await db.query('SELECT lecturer_id FROM courses WHERE id = ?', [courseId]);
    if (course.length === 0) return res.status(404).json({ message: 'Course not found' });
    if (Number(course[0].lecturer_id) !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const validatedChapterId = await validateChapterForCourse(chapter_id, courseId);

    if (req.file) {
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      const ext = path.extname(originalName).toLowerCase();

      // Handle ZIP packages
      if (isZipFile(originalName)) {
        file_type = 'package';
        file_name = originalName;
        packageUpload = await processPackageUpload(req.file);
        file_url = packageUpload.indexUrl;
      } else {
        // Handle regular files
        const storageName = `lesson-${randomUUID()}${ext}`;
        regularUploadLocator = await uploadPrivateFileToStorage(
          req.file.path,
          'lesson-files',
          storageName,
          req.file.detectedMime,
        );
        file_url = regularUploadLocator;
        file_name = originalName;
        file_type = getFileType(originalName);
      }
    }

    const [result] = await db.query(
      'INSERT INTO lessons (course_id, chapter_id, title, content, video_url, file_url, file_name, file_type, lesson_order, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
      [courseId, validatedChapterId, title, content, video_url || null, file_url, file_name, file_type, lesson_order || 0, duration || null]
    );

    res.status(201).json({
      id: result[0].id, course_id: courseId, chapter_id: validatedChapterId, title, content, video_url,
      file_url: file_url ? (file_type === 'package' ? `/api/lessons/${result[0].id}/package-info` : `/api/files/lessons/${result[0].id}/access`) : null,
      file_access_url: file_url && file_type !== 'package' ? `/api/files/lessons/${result[0].id}/access` : null,
      file_name, file_type, lesson_order: lesson_order || 0, duration,
      package_url: file_type === 'package' ? `/api/lessons/${result[0].id}/package-info` : null
    });
  } catch (error) {
    if (packageUpload?.keys) await deleteStorageKeys(packageUpload.keys, { privateBucket: true });
    if (regularUploadLocator) await deleteStoredFile(regularUploadLocator).catch(() => {});
    sendControllerError(res, error);
  } finally {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
  }
};

exports.updateLesson = async (req, res) => {
  let packageUpload = null;
  let regularUploadLocator = null;
  let replacedAsset = null;
  try {
    const body = req.body || {};
    const { title, chapter_id, content, video_url, lesson_order, duration } = body;
    const lessonId = parseId(req.params.id, 'Lesson ID');
    const [lesson] = await db.query('SELECT l.*, c.lecturer_id FROM lessons l JOIN courses c ON l.course_id = c.id WHERE l.id = ?', [lessonId]);
    if (lesson.length === 0) return res.status(404).json({ message: 'Lesson not found' });
    if (Number(lesson[0].lecturer_id) !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const validatedChapterId = chapter_id === undefined
      ? lesson[0].chapter_id
      : await validateChapterForCourse(chapter_id, lesson[0].course_id);

    let file_url = lesson[0].file_url, file_name = lesson[0].file_name, file_type = lesson[0].file_type;
    
    if (req.file) {
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      const ext = path.extname(originalName).toLowerCase();

      // Handle ZIP packages
      if (isZipFile(originalName)) {
        file_type = 'package';
        file_name = originalName;
        packageUpload = await processPackageUpload(req.file);
        file_url = packageUpload.indexUrl;
      } else {
        // Handle regular files
        const storageName = `lesson-${randomUUID()}${ext}`;
        regularUploadLocator = await uploadPrivateFileToStorage(
          req.file.path,
          'lesson-files',
          storageName,
          req.file.detectedMime,
        );
        file_url = regularUploadLocator;
        file_name = originalName;
        file_type = getFileType(originalName);
      }
      replacedAsset = lesson[0];
    }

    await db.query(
      'UPDATE lessons SET title=?, chapter_id=?, content=?, video_url=?, file_url=?, file_name=?, file_type=?, lesson_order=?, duration=? WHERE id=?',
      [
        title || lesson[0].title,
        validatedChapterId,
        content || lesson[0].content,
        video_url !== undefined ? video_url : lesson[0].video_url,
        file_url, file_name, file_type,
        lesson_order !== undefined ? lesson_order : lesson[0].lesson_order,
        duration || lesson[0].duration,
        lessonId
      ]
    );
    if (replacedAsset) {
      await cleanupLessonAsset(replacedAsset).catch(() => {
        console.error('Unable to clean up replaced lesson file');
      });
    }
    res.json({
      message: 'Lesson updated',
      package_url: file_type === 'package' ? `/api/lessons/${lessonId}/package-info` : null,
      file_access_url: file_url && file_type !== 'package' ? `/api/files/lessons/${lessonId}/access` : null,
    });
  } catch (error) {
    if (packageUpload?.keys) await deleteStorageKeys(packageUpload.keys, { privateBucket: true });
    if (regularUploadLocator) await deleteStoredFile(regularUploadLocator).catch(() => {});
    sendControllerError(res, error);
  } finally {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
  }
};

exports.deleteLesson = async (req, res) => {
  try {
    const lessonId = parseId(req.params.id, 'Lesson ID');
    const [lesson] = await db.query('SELECT l.*, c.lecturer_id FROM lessons l JOIN courses c ON l.course_id = c.id WHERE l.id = ?', [lessonId]);
    if (lesson.length === 0) return res.status(404).json({ message: 'Lesson not found' });
    if (Number(lesson[0].lecturer_id) !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await db.query('DELETE FROM lessons WHERE id = ?', [lessonId]);
    await cleanupLessonAsset(lesson[0]).catch(() => {
      console.error('Unable to clean up deleted lesson file');
    });
    res.json({ message: 'Lesson deleted' });
  } catch (error) {
    sendControllerError(res, error);
  }
};

exports.markProgress = async (req, res) => {
  try {
    const { lesson_id, completed } = req.body || {};
    if (req.user.role !== 'student') {
      throw new CourseAccessError(403, 'Only students can update lesson progress');
    }
    if (typeof completed !== 'boolean') {
      throw new CourseAccessError(400, 'completed must be a boolean');
    }
    const lesson = await requireLessonAccess(db, lesson_id, req.user);
    await db.query(
      `INSERT INTO lesson_progress (student_id, lesson_id, completed, completed_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (student_id, lesson_id) DO UPDATE
         SET completed = EXCLUDED.completed, completed_at = EXCLUDED.completed_at`,
      [req.user.id, lesson.id, completed, completed ? new Date() : null]
    );
    res.json({ message: 'Progress updated' });
  } catch (error) {
    sendControllerError(res, error);
  }
};

exports.getProgressForCourse = async (req, res) => {
  try {
    const course = await requireCourseAccess(db, req.params.courseId, req.user);
    const [rows] = await db.query(
      `SELECT lp.lesson_id, lp.completed FROM lesson_progress lp
       JOIN lessons l ON lp.lesson_id = l.id
       WHERE l.course_id = ? AND lp.student_id = ?`,
      [course.id, req.user.id]
    );
    res.json(rows);
  } catch (error) {
    sendControllerError(res, error);
  }
};

/**
 * Get package info for a lesson
 * Used to determine if package should be opened in iframe or redirect
 */
exports.getPackageInfo = async (req, res) => {
  try {
    const authorizedLesson = await requireLessonAccess(db, req.params.lessonId, req.user);
    const [lesson] = await db.query(
      'SELECT id, file_type, file_url, file_name FROM lessons WHERE id = ?',
      [authorizedLesson.id]
    );

    if (lesson.length === 0) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    const lessonData = lesson[0];

    if (lessonData.file_type !== 'package') {
      return res.status(400).json({ message: 'This lesson does not have a package' });
    }

    const entryPath = packageEntryPath(lessonData.file_url);
    if (!entryPath) {
      return res.status(422).json({ message: 'Package reference is invalid' });
    }
    const ticket = issueFileTicket({
      kind: 'package',
      resourceId: lessonData.id,
      userId: req.user.id,
    });
    const cookieSameSite = ['strict', 'lax', 'none'].includes(process.env.FILE_COOKIE_SAME_SITE)
      ? process.env.FILE_COOKIE_SAME_SITE
      : 'lax';
    const cookiePath = `/api/files/packages/${lessonData.id}`;
    const encodedPath = entryPath.split('/').map(encodeURIComponent).join('/');
    res.setHeader('Set-Cookie', [
      `${PACKAGE_COOKIE_NAME}=${encodeURIComponent(ticket)}`,
      `Path=${cookiePath}`,
      'HttpOnly',
      `SameSite=${cookieSameSite[0].toUpperCase()}${cookieSameSite.slice(1)}`,
      `Max-Age=${30 * 60}`,
      ...(process.env.NODE_ENV === 'production' || cookieSameSite === 'none' ? ['Secure'] : []),
    ].join('; '));
    res.json({
      packageUrl: `${cookiePath}/${encodedPath}`,
      fileName: lessonData.file_name,
      canEmbed: true,
      openMethod: 'iframe',
    });
  } catch (error) {
    sendControllerError(res, error);
  }
};
