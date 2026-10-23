const db = require('../config/db');
const {
  CourseAccessError,
  parseId,
  requireCourseOwner,
  sendControllerError,
} = require('../services/courseAccess');

function chapterTitle(value) {
  const title = typeof value === 'string' ? value.trim() : '';
  if (!title || title.length > 255) {
    throw new CourseAccessError(400, 'Title is required and must be at most 255 characters');
  }
  return title;
}

function chapterOrder(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const order = Number(value);
  if (!Number.isInteger(order) || order < 0) {
    throw new CourseAccessError(400, 'Chapter order must be a non-negative integer');
  }
  return order;
}

async function resolveChapter(chapterId) {
  const id = parseId(chapterId, 'Chapter ID');
  const [chapters] = await db.query(
    'SELECT id, course_id, title, chapter_order FROM chapters WHERE id = ?',
    [id],
  );
  if (!chapters.length) throw new CourseAccessError(404, 'Chapter not found');
  return chapters[0];
}

exports.createChapter = async (req, res) => {
  try {
    const course = await requireCourseOwner(db, req.body?.course_id, req.user);
    const title = chapterTitle(req.body?.title);
    const order = chapterOrder(req.body?.chapter_order);
    const [result] = await db.query(
      'INSERT INTO chapters (course_id, title, chapter_order) VALUES (?, ?, ?) RETURNING id',
      [course.id, title, order],
    );
    return res.status(201).json({
      id: result[0].id,
      course_id: course.id,
      title,
      chapter_order: order,
    });
  } catch (error) {
    return sendControllerError(res, error);
  }
};

exports.updateChapter = async (req, res) => {
  try {
    const chapter = await resolveChapter(req.params.id);
    await requireCourseOwner(db, chapter.course_id, req.user);
    const title = req.body?.title === undefined
      ? chapter.title
      : chapterTitle(req.body.title);
    const order = chapterOrder(req.body?.chapter_order, chapter.chapter_order);

    await db.query(
      'UPDATE chapters SET title = ?, chapter_order = ? WHERE id = ?',
      [title, order, chapter.id],
    );
    return res.json({
      message: 'Chapter updated',
      id: chapter.id,
      title,
      chapter_order: order,
    });
  } catch (error) {
    return sendControllerError(res, error);
  }
};

exports.deleteChapter = async (req, res) => {
  try {
    const chapter = await resolveChapter(req.params.id);
    await requireCourseOwner(db, chapter.course_id, req.user);
    await db.query('DELETE FROM chapters WHERE id = ?', [chapter.id]);
    return res.json({ message: 'Chapter deleted' });
  } catch (error) {
    return sendControllerError(res, error);
  }
};
