const path = require('path');
const { pipeline } = require('stream/promises');

const db = require('../config/db');
const { openPackageAsset, openStoredFile } = require('../config/storage');
const { parseAllowedOrigins } = require('../config/runtime');
const { requireLessonAccess } = require('../services/courseAccess');
const { HttpError, requireOwnerOrAdmin, resolveSubmission } = require('../services/assignmentAccess');
const { issueFileTicket, PACKAGE_COOKIE_NAME, verifyFileTicket } = require('../services/fileTickets');
const { mimeTypeForName } = require('../utils/fileValidation');

function handleFileError(error, res) {
  const status = Number.isInteger(error?.statusCode)
    ? error.statusCode
    : Number.isInteger(error?.status)
      ? error.status
      : 500;
  if (status >= 500) console.error('Private file request failed');
  return res.status(status).json({
    code: error?.code || (status === 500 ? 'FILE_REQUEST_FAILED' : 'FILE_ACCESS_DENIED'),
    message: status >= 500 ? 'Unable to access file' : error.message,
  });
}

function authorizeSubmission(user, submission) {
  if (user?.role === 'student' && Number(user.id) === Number(submission.student_id)) return;
  requireOwnerOrAdmin(user, submission);
}

async function currentUser(userId) {
  const [users] = await db.query('SELECT id, role FROM users WHERE id = ?', [userId]);
  if (!users.length) throw new HttpError(401, 'File access user no longer exists');
  return users[0];
}

function accessResponse(req, res, { kind, id, fileName }) {
  const ticket = issueFileTicket({ kind, resourceId: id, userId: req.user.id });
  const root = `/api/files/${kind === 'lesson' ? 'lessons' : 'submissions'}/${id}/content`;
  const encodedTicket = encodeURIComponent(ticket);
  return res.json({
    url: `${root}?ticket=${encodedTicket}`,
    downloadUrl: `${root}?ticket=${encodedTicket}&download=1`,
    fileName,
    expiresInSeconds: 1800,
  });
}

exports.getLessonAccess = async (req, res) => {
  try {
    const lesson = await requireLessonAccess(db, req.params.id, req.user);
    const [files] = await db.query(
      'SELECT id, file_url, file_name, file_type FROM lessons WHERE id = ?',
      [lesson.id],
    );
    const file = files[0];
    if (!file?.file_url || file.file_type === 'package') {
      throw new HttpError(404, 'Lesson file not found');
    }
    return accessResponse(req, res, {
      kind: 'lesson',
      id: file.id,
      fileName: file.file_name || `lesson-${file.id}`,
    });
  } catch (error) {
    return handleFileError(error, res);
  }
};

exports.getSubmissionAccess = async (req, res) => {
  try {
    const submission = await resolveSubmission(db, req.params.id);
    authorizeSubmission(req.user, submission);
    if (!submission.file_url) throw new HttpError(404, 'Submission file not found');
    const extension = path.extname(submission.file_url);
    return accessResponse(req, res, {
      kind: 'submission',
      id: submission.id,
      fileName: `submission-${submission.id}${extension}`,
    });
  } catch (error) {
    return handleFileError(error, res);
  }
};

async function resolveTicketUser(req, kind) {
  const { userId } = verifyFileTicket(req.query?.ticket, {
    kind,
    resourceId: req.params.id,
  });
  return currentUser(userId);
}

function safeDisposition(fileName, download) {
  const fallback = fileName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'file';
  const encoded = encodeURIComponent(fileName).replace(
    /['()]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${download ? 'attachment' : 'inline'}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

async function streamFile(req, res, { locator, fileName }) {
  const storedFile = await openStoredFile(locator, { range: req.headers.range });
  res.setHeader('Content-Type', storedFile.contentType || mimeTypeForName(fileName || locator));
  res.setHeader('Content-Disposition', safeDisposition(fileName, req.query?.download === '1'));
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Accept-Ranges', 'bytes');
  if (storedFile.contentLength !== undefined) {
    res.setHeader('Content-Length', String(storedFile.contentLength));
  }
  if (storedFile.contentRange) {
    res.status(206);
    res.setHeader('Content-Range', storedFile.contentRange);
  }
  await pipeline(storedFile.body, res);
}

exports.streamLesson = async (req, res) => {
  try {
    const user = await resolveTicketUser(req, 'lesson');
    const lesson = await requireLessonAccess(db, req.params.id, user);
    const [files] = await db.query(
      'SELECT file_url, file_name, file_type FROM lessons WHERE id = ?',
      [lesson.id],
    );
    const file = files[0];
    if (!file?.file_url || file.file_type === 'package') {
      throw new HttpError(404, 'Lesson file not found');
    }
    await streamFile(req, res, {
      locator: file.file_url,
      fileName: file.file_name || `lesson-${lesson.id}`,
    });
  } catch (error) {
    if (!res.headersSent) return handleFileError(error, res);
    res.destroy(error);
  }
};

exports.streamSubmission = async (req, res) => {
  try {
    const user = await resolveTicketUser(req, 'submission');
    const submission = await resolveSubmission(db, req.params.id);
    authorizeSubmission(user, submission);
    if (!submission.file_url) throw new HttpError(404, 'Submission file not found');
    await streamFile(req, res, {
      locator: submission.file_url,
      fileName: `submission-${submission.id}${path.extname(submission.file_url)}`,
    });
  } catch (error) {
    if (!res.headersSent) return handleFileError(error, res);
    res.destroy(error);
  }
};

function readCookie(req, name) {
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch (_) {
      return null;
    }
  }
  return null;
}

exports.streamPackageAsset = async (req, res) => {
  try {
    const ticket = readCookie(req, PACKAGE_COOKIE_NAME);
    const { userId } = verifyFileTicket(ticket, {
      kind: 'package',
      resourceId: req.params.id,
    });
    const user = await currentUser(userId);
    const lesson = await requireLessonAccess(db, req.params.id, user);
    const [files] = await db.query(
      'SELECT file_url, file_type FROM lessons WHERE id = ?',
      [lesson.id],
    );
    const file = files[0];
    if (!file?.file_url || file.file_type !== 'package') {
      throw new HttpError(404, 'Lesson package not found');
    }

    const assetPath = Array.isArray(req.params.assetPath)
      ? req.params.assetPath.join('/')
      : req.params.assetPath;
    const storedFile = await openPackageAsset(file.file_url, assetPath, {
      range: req.headers.range,
    });
    const frameAncestors = ["'self'", ...parseAllowedOrigins(process.env.ALLOWED_ORIGINS)].join(' ');
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', `frame-ancestors ${frameAncestors}`);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', storedFile.contentType || mimeTypeForName(assetPath));
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Accept-Ranges', 'bytes');
    if (storedFile.contentLength !== undefined) {
      res.setHeader('Content-Length', String(storedFile.contentLength));
    }
    if (storedFile.contentRange) {
      res.status(206);
      res.setHeader('Content-Range', storedFile.contentRange);
    }
    await pipeline(storedFile.body, res);
  } catch (error) {
    if (!res.headersSent) return handleFileError(error, res);
    res.destroy(error);
  }
};

module.exports.authorizeSubmission = authorizeSubmission;
