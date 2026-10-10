const db = require('../config/db');
const {
  AiServiceError,
  buildSystemPrompt,
  callGemini,
  normalizeChatRequest,
} = require('../services/aiService');

async function getAuthorizedLesson(lessonId, user) {
  const [lessons] = await db.query(
    `SELECT l.id, l.title, l.content, l.course_id,
            c.title AS course_title, c.lecturer_id
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
      WHERE l.id = ?`,
    [lessonId],
  );

  if (lessons.length === 0) {
    throw new AiServiceError('Lesson not found.', 404, 'LESSON_NOT_FOUND');
  }

  const lesson = lessons[0];
  if (user.role === 'admin') return lesson;
  if (user.role === 'lecturer' && Number(lesson.lecturer_id) === Number(user.id)) return lesson;

  if (user.role === 'student') {
    const [enrollments] = await db.query(
      'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
      [user.id, lesson.course_id],
    );
    if (enrollments.length > 0) return lesson;
  }

  throw new AiServiceError('You do not have access to this lesson.', 403, 'LESSON_FORBIDDEN');
}

exports.chat = async (req, res) => {
  try {
    const request = normalizeChatRequest(req.body);
    const lesson = request.mode === 'lesson'
      ? await getAuthorizedLesson(request.lessonId, req.user)
      : null;
    const systemPrompt = buildSystemPrompt({ ...request, lesson });
    const reply = await callGemini({ messages: request.messages, systemPrompt });

    return res.json({ reply });
  } catch (error) {
    if (error instanceof AiServiceError) {
      return res.status(error.statusCode).json({ message: error.message, code: error.code });
    }

    console.error('AI chat request failed');
    return res.status(500).json({ message: 'Unable to process the AI request.' });
  }
};

exports.getAuthorizedLesson = getAuthorizedLesson;
