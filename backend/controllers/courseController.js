const db = require('../config/db');
const path = require('path');
const { randomUUID } = require('crypto');
const {
  deleteStoredFile,
  deleteStoragePrefix,
  packagePrefixFromLocator,
  uploadToStorage,
} = require('../config/storage');
const {
  CourseAccessError,
  hasCourseAccess,
  parseId,
  requireCourseOwner,
  sendControllerError,
} = require('../services/courseAccess');

function textField(value, label, maxLength, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new CourseAccessError(400, `${label} is required`);
    return null;
  }
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    throw new CourseAccessError(400, `${label} must be at most ${maxLength} characters`);
  }
  return value.trim();
}

function priceField(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0 || price > 99999999.99) {
    throw new CourseAccessError(400, 'Price must be a valid non-negative amount');
  }
  return price;
}

function exposeLessonFile(lesson) {
  if (!lesson.file_url) return lesson;
  if (lesson.file_type === 'package') {
    return {
      ...lesson,
      file_url: `/api/lessons/${lesson.id}/package-info`,
      package_url: `/api/lessons/${lesson.id}/package-info`,
      has_file: true,
    };
  }
  const accessUrl = `/api/files/lessons/${lesson.id}/access`;
  return {
    ...lesson,
    file_url: accessUrl,
    file_access_url: accessUrl,
    has_file: true,
  };
}

exports.getCourses = async (req, res) => {
  try {
    const requestQuery = req.query || {};
    const search = requestQuery.search ? `%${String(requestQuery.search).slice(0, 200)}%` : '%';
    const { category, level, priceFilter } = requestQuery;
    let query = `
      SELECT c.*, u.name as lecturer_name,
        COUNT(DISTINCT e.id) as student_count,
        COUNT(DISTINCT l.id) as lesson_count
      FROM courses c
      JOIN users u ON c.lecturer_id = u.id
      LEFT JOIN enrollments e ON e.course_id = c.id
      LEFT JOIN lessons l ON l.course_id = c.id
      WHERE (c.title ILIKE ? OR c.description ILIKE ? OR u.name ILIKE ?)
    `;
    const params = [search, search, search];

    if (category && category !== 'All') {
      query += ' AND c.category = ?';
      params.push(category);
    }
    if (level && level !== 'All') {
      query += ' AND c.level = ?';
      params.push(level);
    }
    if (priceFilter === 'free') query += ' AND c.price = 0';
    if (priceFilter === 'paid') query += ' AND c.price > 0';

    query += ' GROUP BY c.id, u.name ORDER BY c.created_at DESC';
    const [courses] = await db.query(query, params);
    return res.json(courses);
  } catch (error) {
    return sendControllerError(res, error);
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const courseId = parseId(req.params.id, 'Course ID');
    const [courses] = await db.query(`
      SELECT c.*, u.name as lecturer_name,
        COUNT(DISTINCT e.id) as student_count,
        (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lesson_count
      FROM courses c
      JOIN users u ON c.lecturer_id = u.id
      LEFT JOIN enrollments e ON e.course_id = c.id
      WHERE c.id = ?
      GROUP BY c.id, u.name
    `, [courseId]);

    if (!courses.length) return res.status(404).json({ message: 'Course not found' });
    const course = courses[0];
    const hasFullAccess = await hasCourseAccess(db, course, req.user);

    if (!hasFullAccess) {
      return res.json({
        ...course,
        has_full_access: false,
        chapters: [],
        lessons: [],
        assignments: [],
      });
    }

    const [chapters] = await db.query(
      `SELECT id, course_id, title, chapter_order, created_at
       FROM chapters WHERE course_id = ?
       ORDER BY chapter_order ASC, id ASC`,
      [course.id]
    );
    const [lessonRows] = await db.query(
      `SELECT id, course_id, chapter_id, title, content, video_url, file_url,
              file_name, file_type, lesson_order, duration, created_at
       FROM lessons WHERE course_id = ?
       ORDER BY lesson_order ASC, id ASC`,
      [course.id]
    );
    const lessons = lessonRows.map(exposeLessonFile);
    let assignmentQuery =
      `SELECT id, course_id, chapter_id, title, description, type,
              total_points, due_date
       FROM assignments WHERE course_id = ?`;
    if (req.user?.role === 'student') assignmentQuery += " AND status = 'published'";
    const [assignments] = await db.query(assignmentQuery, [course.id]);

    const chaptersWithLessons = chapters.map((chapter) => ({
      ...chapter,
      lessons: lessons.filter((lesson) => Number(lesson.chapter_id) === Number(chapter.id)),
      assignments: assignments.filter(
        (assignment) => Number(assignment.chapter_id) === Number(chapter.id)
      ),
    }));
    const uncategorizedLessons = lessons.filter((lesson) => !lesson.chapter_id);
    const uncategorizedAssignments = assignments.filter((assignment) => !assignment.chapter_id);
    if (uncategorizedLessons.length || uncategorizedAssignments.length) {
      chaptersWithLessons.push({
        id: 'uncategorized',
        title: 'Uncategorized',
        lessons: uncategorizedLessons,
        assignments: uncategorizedAssignments,
      });
    }

    return res.json({
      ...course,
      has_full_access: true,
      chapters: chaptersWithLessons,
      lessons,
      assignments,
    });
  } catch (error) {
    return sendControllerError(res, error);
  }
};

exports.createCourse = async (req, res) => {
  let uploadedThumbnail = null;
  try {
    const body = req.body || {};
    const title = textField(body.title, 'Title', 255, { required: true });
    const description = textField(body.description, 'Description', 20_000);
    const category = textField(body.category, 'Category', 100) || 'General';
    const level = textField(body.level, 'Level', 50) || 'Beginner';
    const price = priceField(body.price);
    let thumbnailUrl = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      uploadedThumbnail = await uploadToStorage(
        req.file.buffer,
        'course-thumbnails',
        `thumb-${randomUUID()}${ext}`,
        req.file.detectedMime,
      );
      thumbnailUrl = uploadedThumbnail;
    }

    const [result] = await db.query(
      `INSERT INTO courses
       (title, description, category, thumbnail_url, lecturer_id, price, level)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [title, description, category, thumbnailUrl, req.user.id, price, level]
    );
    return res.status(201).json({
      id: result[0].id,
      title,
      description,
      category,
      thumbnail_url: thumbnailUrl,
      lecturer_id: req.user.id,
      price,
      level,
    });
  } catch (error) {
    if (uploadedThumbnail) await deleteStoredFile(uploadedThumbnail).catch(() => {});
    return sendControllerError(res, error);
  }
};

exports.updateCourse = async (req, res) => {
  let uploadedThumbnail = null;
  try {
    const course = await requireCourseOwner(db, req.params.id, req.user);
    const body = req.body || {};
    const title = body.title === undefined
      ? course.title
      : textField(body.title, 'Title', 255, { required: true });
    const description = body.description === undefined
      ? course.description
      : textField(body.description, 'Description', 20_000);
    const category = body.category === undefined
      ? course.category
      : textField(body.category, 'Category', 100, { required: true });
    const level = body.level === undefined
      ? course.level
      : textField(body.level, 'Level', 50, { required: true });
    const price = priceField(body.price, course.price);
    let thumbnailUrl = course.thumbnail_url;
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      uploadedThumbnail = await uploadToStorage(
        req.file.buffer,
        'course-thumbnails',
        `thumb-${randomUUID()}${ext}`,
        req.file.detectedMime,
      );
      thumbnailUrl = uploadedThumbnail;
    }

    await db.query(
      `UPDATE courses
       SET title=?, description=?, category=?, thumbnail_url=?, price=?, level=?
       WHERE id=?`,
      [
        title,
        description,
        category,
        thumbnailUrl,
        price,
        level,
        course.id,
      ]
    );
    if (uploadedThumbnail && course.thumbnail_url) {
      await deleteStoredFile(course.thumbnail_url).catch(() => {
        console.error('Unable to clean up replaced course thumbnail');
      });
    }
    return res.json({
      message: 'Course updated',
      id: course.id,
      title,
      description,
      category,
      thumbnail_url: thumbnailUrl,
      price,
      level,
    });
  } catch (error) {
    if (uploadedThumbnail) await deleteStoredFile(uploadedThumbnail).catch(() => {});
    return sendControllerError(res, error);
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const course = await requireCourseOwner(db, req.params.id, req.user);
    const [lessonFiles] = await db.query(
      'SELECT file_url, file_type FROM lessons WHERE course_id = ? AND file_url IS NOT NULL',
      [course.id],
    );
    const [submissionFiles] = await db.query(
      `SELECT s.file_url FROM assignment_submissions s
       JOIN assignments a ON a.id = s.assignment_id
       WHERE a.course_id = ? AND s.file_url IS NOT NULL`,
      [course.id],
    );
    await db.query('DELETE FROM courses WHERE id = ?', [course.id]);
    const cleanupOperations = [];
    if (course.thumbnail_url) cleanupOperations.push(deleteStoredFile(course.thumbnail_url));
    for (const file of submissionFiles) cleanupOperations.push(deleteStoredFile(file.file_url));
    for (const file of lessonFiles) {
      if (file.file_type === 'package') {
        const prefix = packagePrefixFromLocator(file.file_url);
        if (prefix) {
          cleanupOperations.push(deleteStoragePrefix(prefix, {
            privateBucket: file.file_url.startsWith('r2://'),
          }));
        }
      } else {
        cleanupOperations.push(deleteStoredFile(file.file_url));
      }
    }
    const cleanupResults = await Promise.allSettled(cleanupOperations);
    if (cleanupResults.some((result) => result.status === 'rejected')) {
      console.error('Unable to clean up one or more deleted course files');
    }
    return res.json({ message: 'Course deleted' });
  } catch (error) {
    return sendControllerError(res, error);
  }
};
