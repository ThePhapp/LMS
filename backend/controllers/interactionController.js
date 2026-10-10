const db = require('../config/db');
const {
  CourseAccessError,
  parseId,
  requireCourseAccess,
  requireLessonAccess,
  sendControllerError,
} = require('../services/courseAccess');

function requireText(value, label, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new CourseAccessError(400, `${label} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new CourseAccessError(400, `${label} is too long`);
  }
  return trimmed;
}

exports.getNotes = async (req, res) => {
  try {
    const lesson = await requireLessonAccess(db, req.params.lessonId, req.user);
    const [notes] = await db.query(
      'SELECT id, content, updated_at FROM notes WHERE user_id = ? AND lesson_id = ?',
      [req.user.id, lesson.id]
    );
    return res.json(notes[0] || { content: '' });
  } catch (error) {
    return sendControllerError(res, error);
  }
};

exports.saveNote = async (req, res) => {
  try {
    const content = typeof req.body?.content === 'string' ? req.body.content : null;
    if (content === null || content.length > 50000) {
      throw new CourseAccessError(400, 'Content must be text with at most 50000 characters');
    }
    const lesson = await requireLessonAccess(db, req.params.lessonId, req.user);
    const [existing] = await db.query(
      'SELECT id FROM notes WHERE user_id = ? AND lesson_id = ?',
      [req.user.id, lesson.id]
    );

    if (existing.length) {
      await db.query(
        'UPDATE notes SET content = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
        [content, existing[0].id, req.user.id]
      );
    } else {
      await db.query(
        'INSERT INTO notes (user_id, lesson_id, content) VALUES (?, ?, ?)',
        [req.user.id, lesson.id, content]
      );
    }
    return res.json({ message: 'Note saved' });
  } catch (error) {
    return sendControllerError(res, error);
  }
};

exports.getComments = async (req, res) => {
  try {
    const lesson = await requireLessonAccess(db, req.params.lessonId, req.user);
    const [comments] = await db.query(`
      SELECT c.*, u.name as user_name, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.lesson_id = ?
      ORDER BY COALESCE(c.parent_id, c.id), c.created_at ASC
    `, [lesson.id]);
    return res.json(comments);
  } catch (error) {
    return sendControllerError(res, error);
  }
};

exports.addComment = async (req, res) => {
  try {
    const content = requireText(req.body?.content, 'Content', 10000);
    const lesson = await requireLessonAccess(db, req.params.lessonId, req.user);
    let parentId = null;

    if (req.body.parent_id !== undefined && req.body.parent_id !== null) {
      parentId = parseId(req.body.parent_id, 'Parent comment ID');
      const [parents] = await db.query(
        'SELECT id FROM comments WHERE id = ? AND lesson_id = ?',
        [parentId, lesson.id]
      );
      if (!parents.length) {
        throw new CourseAccessError(400, 'Parent comment must belong to the same lesson');
      }
    }

    const [result] = await db.query(
      `INSERT INTO comments (user_id, lesson_id, content, parent_id)
       VALUES (?, ?, ?, ?) RETURNING id`,
      [req.user.id, lesson.id, content, parentId]
    );
    const [newComments] = await db.query(`
      SELECT c.*, u.name as user_name, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result[0].id]);
    return res.status(201).json(newComments[0]);
  } catch (error) {
    return sendControllerError(res, error);
  }
};

exports.getForums = async (req, res) => {
  try {
    let query = `
      SELECT f.*, u.name as author_name, c.title as course_title,
             (SELECT COUNT(*) FROM forum_replies WHERE topic_id = f.id) as reply_count
      FROM forum_topics f
      JOIN users u ON f.user_id = u.id
      LEFT JOIN courses c ON f.course_id = c.id
    `;
    const params = [];

    if (req.query.course_id !== undefined) {
      const courseId = parseId(req.query.course_id, 'Course ID');
      await requireCourseAccess(db, courseId, req.user);
      query += ' WHERE f.course_id = ?';
      params.push(courseId);
    } else {
      query += ' WHERE f.course_id IS NULL';
    }
    query += ' ORDER BY f.created_at DESC';

    const [topics] = await db.query(query, params);
    return res.json(topics);
  } catch (error) {
    return sendControllerError(res, error);
  }
};

exports.getForumById = async (req, res) => {
  try {
    const topicId = parseId(req.params.id, 'Topic ID');
    const [topics] = await db.query(`
      SELECT f.*, u.name as author_name, c.title as course_title
      FROM forum_topics f
      JOIN users u ON f.user_id = u.id
      LEFT JOIN courses c ON f.course_id = c.id
      WHERE f.id = ?
    `, [topicId]);
    if (!topics.length) throw new CourseAccessError(404, 'Topic not found');
    const topic = topics[0];

    if (topic.course_id) {
      await requireCourseAccess(db, topic.course_id, req.user);
    }

    await db.query('UPDATE forum_topics SET views = views + 1 WHERE id = ?', [topicId]);
    const [replies] = await db.query(`
      SELECT r.*, u.name as reply_author, u.role as reply_role
      FROM forum_replies r
      JOIN users u ON r.user_id = u.id
      WHERE r.topic_id = ?
      ORDER BY r.created_at ASC
    `, [topicId]);
    return res.json({ ...topic, views: Number(topic.views || 0) + 1, replies });
  } catch (error) {
    return sendControllerError(res, error);
  }
};

exports.createForum = async (req, res) => {
  try {
    const title = requireText(req.body?.title, 'Title', 255);
    const content = requireText(req.body?.content, 'Content', 50000);
    let courseId = null;
    if (req.body?.course_id !== undefined && req.body.course_id !== null && req.body.course_id !== '') {
      courseId = parseId(req.body.course_id, 'Course ID');
      await requireCourseAccess(db, courseId, req.user);
    }

    const [result] = await db.query(
      `INSERT INTO forum_topics (course_id, user_id, title, content)
       VALUES (?, ?, ?, ?) RETURNING id`,
      [courseId, req.user.id, title, content]
    );
    return res.status(201).json({ id: result[0].id });
  } catch (error) {
    return sendControllerError(res, error);
  }
};

exports.replyForum = async (req, res) => {
  try {
    const content = requireText(req.body?.content, 'Content', 10000);
    const topicId = parseId(req.params.id, 'Topic ID');
    const [topics] = await db.query(
      'SELECT id, course_id FROM forum_topics WHERE id = ?',
      [topicId]
    );
    if (!topics.length) throw new CourseAccessError(404, 'Topic not found');
    if (topics[0].course_id) {
      await requireCourseAccess(db, topics[0].course_id, req.user);
    }

    const [result] = await db.query(
      `INSERT INTO forum_replies (topic_id, user_id, content)
       VALUES (?, ?, ?) RETURNING id`,
      [topicId, req.user.id, content]
    );
    return res.status(201).json({ id: result[0].id });
  } catch (error) {
    return sendControllerError(res, error);
  }
};
