const db = require('../config/db');
const { deleteStoredFile } = require('../config/storage');
const {
  HttpError,
  badRequest,
  parseId,
  requireEnrollment,
  requireOwnerOrAdmin,
  requireStudent,
  requireStudentAssignmentAccess,
  resolveAssignment,
  resolveCourse,
  resolveQuestion,
  resolveSubmission,
} = require('../services/assignmentAccess');

function handleError(error, res) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error('Assignment request failed');
  return res.status(500).json({ message: 'Unable to process assignment request' });
}

function parseJson(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return value;
  }
}

function serializeSubmission(submission) {
  const hasFile = Boolean(submission.file_url);
  return {
    ...submission,
    file_url: hasFile ? `/api/files/submissions/${submission.id}/access` : null,
    file_access_url: hasFile ? `/api/files/submissions/${submission.id}/access` : null,
    has_file: hasFile,
  };
}

async function attachStudentSubmissions(executor, assignments, studentId) {
  if (!assignments.length) return assignments;
  const assignmentIds = assignments.map(assignment => Number(assignment.id));
  const [submissions] = await executor.query(
    `SELECT id, assignment_id, score, status, submitted_at, attempt_number
     FROM assignment_submissions
     WHERE student_id = ? AND assignment_id = ANY(?::int[])
     ORDER BY assignment_id, submitted_at DESC`,
    [studentId, assignmentIds],
  );
  const submissionsByAssignment = new Map();
  for (const submission of submissions) {
    const key = Number(submission.assignment_id);
    if (!submissionsByAssignment.has(key)) submissionsByAssignment.set(key, []);
    submissionsByAssignment.get(key).push(submission);
  }

  for (const assignment of assignments) {
    const ownSubmissions = submissionsByAssignment.get(Number(assignment.id)) || [];
    assignment.my_submissions = ownSubmissions;
    assignment.submission_count = ownSubmissions.length;
    if (ownSubmissions.length > 0) {
      assignment.best_score = Math.max(
        ...ownSubmissions.filter(item => item.score !== null).map(item => Number(item.score)),
        0,
      );
      assignment.latest_status = ownSubmissions[0].status;
    }
  }
  return assignments;
}

function positiveInteger(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    badRequest(`${fieldName} must be a positive integer`);
  }
  return number;
}

function nonNegativeInteger(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    badRequest(`${fieldName} must be a non-negative integer`);
  }
  return number;
}

function validateStatus(status) {
  if (!['draft', 'published', 'archived'].includes(status)) {
    badRequest('Invalid assignment status');
  }
  return status;
}

function validateAssignmentType(type) {
  if (!['quiz', 'essay'].includes(type)) badRequest('Invalid assignment type');
  return type;
}

function validateQuestionType(type) {
  if (!['multiple_choice', 'true_false', 'fill_blank', 'essay'].includes(type)) {
    badRequest('Invalid question type');
  }
  return type;
}

function requiredText(value, fieldName, maxLength) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > maxLength) {
    badRequest(`${fieldName} is required and must be at most ${maxLength} characters`);
  }
  return text;
}

function optionalText(value, fieldName, maxLength) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > maxLength) {
    badRequest(`${fieldName} must be at most ${maxLength} characters`);
  }
  return value;
}

function optionalBoolean(value, fallback, fieldName) {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') badRequest(`${fieldName} must be a boolean`);
  return value;
}

function optionalDate(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  if (Number.isNaN(new Date(value).getTime())) badRequest(`${fieldName} must be a valid date`);
  return value;
}

async function requireChapterInCourse(executor, chapterId, courseId) {
  const id = parseId(chapterId, 'Chapter ID');
  const [chapters] = await executor.query(
    'SELECT id FROM chapters WHERE id = ? AND course_id = ?',
    [id, courseId]
  );
  if (chapters.length === 0) {
    badRequest('Chapter does not belong to this course');
  }
  return id;
}

function questionValues(question, defaultOrder = 0) {
  if (!question || typeof question !== 'object' || Array.isArray(question)) badRequest('Invalid question');
  const questionText = requiredText(question.question_text, 'question_text', 10_000);
  const type = validateQuestionType(question.question_type || 'multiple_choice');
  const options = question.options ?? [];
  if (!Array.isArray(options) || options.length > 20
      || options.some(option => typeof option !== 'string' || option.length > 1_000)) {
    badRequest('options must be an array of at most 20 text values');
  }
  const correctOption = nonNegativeInteger(question.correct_option ?? 0, 'correct_option');
  if (['multiple_choice', 'true_false'].includes(type)) {
    if (options.length < 2) badRequest('At least two options are required');
    if (correctOption >= options.length) badRequest('correct_option is outside the options list');
  }
  const correctAnswer = optionalText(question.correct_answer, 'correct_answer', 4_000);
  if (type === 'fill_blank' && !correctAnswer) badRequest('correct_answer is required');

  return [
    questionText,
    type,
    JSON.stringify(options),
    correctOption,
    correctAnswer,
    question.points === undefined ? 10 : positiveInteger(question.points, 'points'),
    question.question_order === undefined
      ? defaultOrder
      : nonNegativeInteger(question.question_order, 'question_order'),
  ];
}

// --- ASSIGNMENTS ---

exports.createAssignment = async (req, res) => {
  const body = req.body || {};
  try {
    const course = await resolveCourse(db, req.params.courseId);
    requireOwnerOrAdmin(req.user, course);

    const title = requiredText(body.title, 'title', 255);
    const description = optionalText(body.description, 'description', 20_000);
    const chapterId = await requireChapterInCourse(db, body.chapter_id, course.id);
    const type = validateAssignmentType(body.type || 'quiz');
    const totalPoints = body.total_points === undefined
      ? 100
      : positiveInteger(body.total_points, 'total_points');
    const maxAttempts = body.max_attempts === undefined
      ? 1
      : nonNegativeInteger(body.max_attempts, 'max_attempts');
    const status = validateStatus(body.status || 'published');
    const dueDate = optionalDate(body.due_date, 'due_date');
    const timeLimit = body.time_limit === undefined || body.time_limit === null || body.time_limit === ''
      ? null
      : positiveInteger(body.time_limit, 'time_limit');

    const [result] = await db.query(
      `INSERT INTO assignments (course_id, chapter_id, title, description, type, total_points, due_date,
        status, shuffle_questions, shuffle_options, time_limit, max_attempts, allow_resubmit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [course.id, chapterId, title, description, type, totalPoints, dueDate,
       status,
       optionalBoolean(body.shuffle_questions, false, 'shuffle_questions'),
       optionalBoolean(body.shuffle_options, false, 'shuffle_options'),
       timeLimit, maxAttempts,
       optionalBoolean(body.allow_resubmit, false, 'allow_resubmit')]
    );

    if (status === 'published') {
      try {
        const [students] = await db.query(
          'SELECT student_id FROM enrollments WHERE course_id = ?', [course.id]
        );
        const notifType = type === 'quiz' ? 'quiz_posted' : 'assignment_posted';
        for (const student of students) {
          await db.query(
            'INSERT INTO notifications (user_id, type, title, message, reference_id) VALUES (?, ?, ?, ?, ?)',
            [student.student_id, notifType, `Bài ${type === 'quiz' ? 'quiz' : 'tập'} mới: ${title}`,
             description ? description.substring(0, 200) : '', result[0].id]
          );
        }
      } catch (_) {
        // Notifications are best-effort and must not fail assignment creation.
      }
    }

    return res.status(201).json({ id: result[0].id, message: 'Assignment created successfully' });
  } catch (error) {
    return handleError(error, res);
  }
};

exports.updateAssignment = async (req, res) => {
  const body = req.body || {};
  try {
    const assignment = await resolveAssignment(db, req.params.id);
    requireOwnerOrAdmin(req.user, assignment);
    const title = body.title === undefined
      ? assignment.title
      : requiredText(body.title, 'title', 255);
    const description = body.description === undefined
      ? assignment.description
      : optionalText(body.description, 'description', 20_000);

    const totalPoints = body.total_points === undefined
      ? assignment.total_points
      : positiveInteger(body.total_points, 'total_points');
    const maxAttempts = body.max_attempts === undefined
      ? assignment.max_attempts
      : nonNegativeInteger(body.max_attempts, 'max_attempts');
    const status = body.status === undefined ? assignment.status : validateStatus(body.status);
    const type = body.type === undefined ? assignment.type : validateAssignmentType(body.type);
    const dueDate = body.due_date === undefined
      ? assignment.due_date
      : optionalDate(body.due_date, 'due_date');
    const timeLimit = body.time_limit === undefined
      ? assignment.time_limit
      : body.time_limit === null || body.time_limit === ''
        ? null
        : positiveInteger(body.time_limit, 'time_limit');

    await db.query(
      `UPDATE assignments SET title = ?, description = ?, type = ?, total_points = ?, due_date = ?,
        status = ?, shuffle_questions = ?, shuffle_options = ?, time_limit = ?, max_attempts = ?, allow_resubmit = ?
       WHERE id = ?`,
      [title, description,
       type, totalPoints, dueDate,
       status,
       optionalBoolean(body.shuffle_questions, assignment.shuffle_questions, 'shuffle_questions'),
       optionalBoolean(body.shuffle_options, assignment.shuffle_options, 'shuffle_options'),
       timeLimit, maxAttempts,
       optionalBoolean(body.allow_resubmit, assignment.allow_resubmit, 'allow_resubmit'),
       assignment.id]
    );
    return res.json({ message: 'Assignment updated successfully' });
  } catch (error) {
    return handleError(error, res);
  }
};

exports.getAssignments = async (req, res) => {
  try {
    const course = await resolveCourse(db, req.params.courseId);
    const { status: filterStatus } = req.query || {};
    let query = 'SELECT * FROM assignments WHERE course_id = ?';
    const params = [course.id];

    if (req.user?.role === 'student') {
      await requireEnrollment(db, req.user, course.id);
      query += " AND status = 'published'";
    } else {
      requireOwnerOrAdmin(req.user, course);
      if (filterStatus) {
        query += ' AND status = ?';
        params.push(validateStatus(filterStatus));
      }
    }

    query += ' ORDER BY created_at DESC';
    const [assignments] = await db.query(query, params);

    if (req.user.role === 'student') {
      await attachStudentSubmissions(db, assignments, req.user.id);
    }

    return res.json(assignments);
  } catch (error) {
    return handleError(error, res);
  }
};

exports.getAssignmentById = async (req, res) => {
  try {
    const resolved = await resolveAssignment(db, req.params.id);
    const assignment = { ...resolved };
    let submissions = [];
    let includeAnswers = true;

    if (req.user?.role === 'student') {
      await requireStudentAssignmentAccess(db, req.user, assignment);
      [submissions] = await db.query(
        `SELECT * FROM assignment_submissions
         WHERE assignment_id = ? AND student_id = ? ORDER BY submitted_at DESC`,
        [assignment.id, req.user.id]
      );
      const attemptCount = submissions.length;
      const maxAttempts = Number(assignment.max_attempts);
      includeAnswers = maxAttempts > 0 && attemptCount >= maxAttempts;

      if (submissions.length > 0) {
        assignment.my_submissions = submissions.map(submission => ({
          ...serializeSubmission(submission),
          answers: parseJson(submission.answers),
        }));
        assignment.my_submission = assignment.my_submissions[0];
        assignment.best_score = Math.max(
          ...submissions.filter(item => item.score !== null).map(item => Number(item.score)),
          0
        );
      }
      assignment.attempt_count = attemptCount;
    } else {
      requireOwnerOrAdmin(req.user, assignment);
    }

    if (assignment.type === 'quiz') {
      const fields = includeAnswers
        ? 'id, question_text, question_type, options, correct_option, correct_answer, points, question_order'
        : 'id, question_text, question_type, options, points, question_order';
      const [questions] = await db.query(
        `SELECT ${fields} FROM assignment_questions WHERE assignment_id = ? ORDER BY question_order, id`,
        [assignment.id]
      );
      assignment.questions = questions.map(question => ({
        ...question,
        options: parseJson(question.options),
      }));

      if (assignment.shuffle_questions && !includeAnswers) {
        assignment.questions = shuffleArray(assignment.questions);
      }
    }

    delete assignment.lecturer_id;
    return res.json(assignment);
  } catch (error) {
    return handleError(error, res);
  }
};

function shuffleArray(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await resolveAssignment(db, req.params.id);
    requireOwnerOrAdmin(req.user, assignment);
    const [submissionFiles] = await db.query(
      'SELECT file_url FROM assignment_submissions WHERE assignment_id = ? AND file_url IS NOT NULL',
      [assignment.id],
    );
    await db.query('DELETE FROM assignments WHERE id = ?', [assignment.id]);
    await Promise.allSettled(submissionFiles.map((submission) => deleteStoredFile(submission.file_url)));
    return res.json({ message: 'Assignment deleted' });
  } catch (error) {
    return handleError(error, res);
  }
};

// --- QUESTIONS ---

exports.addQuestion = async (req, res) => {
  try {
    const assignment = await resolveAssignment(db, req.params.id);
    requireOwnerOrAdmin(req.user, assignment);
    const values = questionValues(req.body || {});
    const [result] = await db.query(
      `INSERT INTO assignment_questions (assignment_id, question_text, question_type, options, correct_option, correct_answer, points, question_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [assignment.id, ...values]
    );
    return res.status(201).json({ id: result[0].id, message: 'Question added' });
  } catch (error) {
    return handleError(error, res);
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const question = await resolveQuestion(db, req.params.questionId);
    requireOwnerOrAdmin(req.user, question);
    const values = questionValues(req.body || {});
    await db.query(
      `UPDATE assignment_questions SET question_text = ?, question_type = ?, options = ?, correct_option = ?, correct_answer = ?, points = ?, question_order = ? WHERE id = ?`,
      [...values, question.id]
    );
    return res.json({ message: 'Question updated' });
  } catch (error) {
    return handleError(error, res);
  }
};

exports.bulkSaveQuestions = async (req, res) => {
  const questions = req.body?.questions;
  try {
    if (!Array.isArray(questions)) badRequest('questions must be an array');

    const saved = await db.withTransaction(async transaction => {
      const assignment = await resolveAssignment(transaction, req.params.id, { lock: 'update' });
      requireOwnerOrAdmin(req.user, assignment);
      const normalized = questions.map((question, index) => questionValues(question, index));

      await transaction.query(
        'DELETE FROM assignment_questions WHERE assignment_id = ?',
        [assignment.id]
      );
      for (const values of normalized) {
        await transaction.query(
          `INSERT INTO assignment_questions (assignment_id, question_text, question_type, options, correct_option, correct_answer, points, question_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [assignment.id, ...values]
        );
      }

      const [rows] = await transaction.query(
        `SELECT id, question_text, question_type, options, correct_option, correct_answer, points, question_order
         FROM assignment_questions WHERE assignment_id = ? ORDER BY question_order, id`,
        [assignment.id]
      );
      return rows;
    });

    return res.json({
      message: `${questions.length} questions saved`,
      questions: saved.map(question => ({ ...question, options: parseJson(question.options) })),
    });
  } catch (error) {
    return handleError(error, res);
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const question = await resolveQuestion(db, req.params.questionId);
    requireOwnerOrAdmin(req.user, question);
    await db.query('DELETE FROM assignment_questions WHERE id = ?', [question.id]);
    return res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    return handleError(error, res);
  }
};

// --- SUBMISSIONS & GRADING ---

exports.submitAssignment = async (req, res) => {
  const body = req.body || {};
  let submissionSaved = false;
  try {
    const result = await db.withTransaction(async transaction => {
      const assignment = await resolveAssignment(transaction, req.params.id, { lock: 'share' });
      await requireStudentAssignmentAccess(transaction, req.user, assignment, { lockEnrollment: true });

      if (assignment.due_date && new Date() > new Date(assignment.due_date)) {
        throw new HttpError(403, 'Assignment due date has passed. You cannot submit it anymore.');
      }

      const [countRows] = await transaction.query(
        'SELECT COUNT(*) as count FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?',
        [assignment.id, req.user.id]
      );
      const attemptCount = Number(countRows[0]?.count || 0);

      if (assignment.type === 'essay' && attemptCount > 0 && !assignment.allow_resubmit) {
        throw new HttpError(403, 'You have already submitted this assignment and resubmission is not allowed.');
      }

      const maxAttempts = Number(assignment.max_attempts);
      if (assignment.type === 'quiz' && maxAttempts > 0 && attemptCount >= maxAttempts) {
        throw new HttpError(403, `You have reached the maximum number of attempts (${maxAttempts}).`);
      }

      const attemptNumber = attemptCount + 1;
      if (assignment.type === 'quiz') {
        if (req.file) badRequest('File uploads are only supported for essay assignments');
        if (!body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) {
          badRequest('answers must be an object');
        }
        const [questions] = await transaction.query(
          'SELECT * FROM assignment_questions WHERE assignment_id = ?',
          [assignment.id]
        );

        let score = 0;
        let totalPossible = 0;
        const questionResults = [];
        for (const question of questions) {
          const points = Number(question.points);
          totalPossible += points;
          const studentAnswer = body.answers[question.id];
          let isCorrect = false;

          switch (question.question_type || 'multiple_choice') {
            case 'multiple_choice':
            case 'true_false':
              isCorrect = studentAnswer !== undefined
                && String(studentAnswer) === String(question.correct_option);
              break;
            case 'fill_blank':
              if (question.correct_answer != null && studentAnswer != null) {
                isCorrect = String(studentAnswer).trim().toLowerCase()
                  === String(question.correct_answer).trim().toLowerCase();
              }
              break;
            case 'essay':
              isCorrect = false;
              break;
            default:
              isCorrect = false;
          }

          if (isCorrect) score += points;
          questionResults.push({
            id: question.id,
            question_type: question.question_type || 'multiple_choice',
            is_correct: isCorrect,
            points,
          });
        }

        const hasEssayQuestions = questions.some(
          question => (question.question_type || 'multiple_choice') === 'essay'
        );
        const finalScore = totalPossible > 0
          ? Math.round((score / totalPossible) * Number(assignment.total_points))
          : 0;
        const submissionStatus = hasEssayQuestions ? 'submitted' : 'graded';

        await transaction.query(
          `INSERT INTO assignment_submissions (assignment_id, student_id, answers, score, status, attempt_number)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [assignment.id, req.user.id, JSON.stringify(body.answers), finalScore,
           submissionStatus, attemptNumber]
        );

        return {
          assignment,
          response: {
            message: hasEssayQuestions
              ? 'Quiz submitted. Some questions require manual grading.'
              : 'Quiz graded successfully',
            score: finalScore,
            total: assignment.total_points,
            ...(maxAttempts > 0 && attemptNumber >= maxAttempts
              ? { question_results: questionResults }
              : {}),
            attempt_number: attemptNumber,
          },
        };
      }

      const content = optionalText(body.content, 'content', 100_000);
      const fileUrl = req.file?.storageLocator || null;
      if (!content && !fileUrl) badRequest('Essay content or a file is required');
      await transaction.query(
        `INSERT INTO assignment_submissions (assignment_id, student_id, content, file_url, status, attempt_number)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [assignment.id, req.user.id, content, fileUrl, 'submitted', attemptNumber]
      );
      return {
        assignment,
        response: {
          message: 'Essay submitted successfully. Waiting for grading.',
          attempt_number: attemptNumber,
        },
      };
    });
    submissionSaved = true;

    try {
      const [students] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
      const isQuiz = result.assignment.type === 'quiz';
      await db.query(
        'INSERT INTO notifications (user_id, type, title, message, reference_id) VALUES (?, ?, ?, ?, ?)',
        [result.assignment.lecturer_id, 'submission_received',
         `${students[0]?.name || 'Học sinh'} đã nộp bài ${isQuiz ? 'quiz' : 'tập'}: ${result.assignment.title}`,
         isQuiz ? `Điểm: ${result.response.score}/${result.assignment.total_points}` : '',
         result.assignment.id]
      );
    } catch (_) {
      // Notifications are best-effort and occur only after the submission commits.
    }

    return res.status(201).json(result.response);
  } catch (error) {
    if (!submissionSaved && req.file?.storageLocator) {
      await deleteStoredFile(req.file.storageLocator).catch(() => {});
    }
    return handleError(error, res);
  }
};

exports.getSubmissions = async (req, res) => {
  try {
    const assignment = await resolveAssignment(db, req.params.id);
    requireOwnerOrAdmin(req.user, assignment);
    const [submissions] = await db.query(
      `SELECT s.*, u.name as student_name, u.email as student_email
       FROM assignment_submissions s
       JOIN users u ON s.student_id = u.id
       WHERE s.assignment_id = ?
       ORDER BY s.submitted_at DESC`,
      [assignment.id]
    );
    return res.json(submissions.map(serializeSubmission));
  } catch (error) {
    return handleError(error, res);
  }
};

exports.getMySubmissions = async (req, res) => {
  try {
    const assignment = await resolveAssignment(db, req.params.id);
    await requireStudentAssignmentAccess(db, req.user, assignment);
    const [submissions] = await db.query(
      `SELECT * FROM assignment_submissions
       WHERE assignment_id = ? AND student_id = ? ORDER BY submitted_at DESC`,
      [assignment.id, req.user.id]
    );
    return res.json(submissions.map(submission => ({
      ...serializeSubmission(submission),
      answers: parseJson(submission.answers),
    })));
  } catch (error) {
    return handleError(error, res);
  }
};

exports.getMyAllAssignments = async (req, res) => {
  try {
    requireStudent(req.user);
    const [assignments] = await db.query(
      `SELECT a.*, c.title as course_title
       FROM assignments a
       JOIN enrollments e ON a.course_id = e.course_id
       JOIN courses c ON a.course_id = c.id
       WHERE e.student_id = ? AND a.status = 'published'
       ORDER BY a.due_date ASC`,
      [req.user.id]
    );

    await attachStudentSubmissions(db, assignments, req.user.id);

    return res.json(assignments);
  } catch (error) {
    return handleError(error, res);
  }
};

exports.gradeSubmission = async (req, res) => {
  try {
    const submission = await resolveSubmission(db, req.params.subId);
    requireOwnerOrAdmin(req.user, submission);
    const rawScore = req.body?.score;
    const score = Number(rawScore);
    const totalPoints = Number(submission.total_points);
    if (rawScore === undefined || rawScore === null || rawScore === ''
        || !Number.isInteger(score) || score < 0 || score > totalPoints) {
      badRequest(`score must be an integer between 0 and ${totalPoints}`);
    }
    const feedback = optionalText(req.body?.feedback, 'feedback', 5_000);

    await db.query(
      'UPDATE assignment_submissions SET score = ?, feedback = ?, status = ? WHERE id = ?',
      [score, feedback, 'graded', submission.id]
    );

    try {
      await db.query(
        'INSERT INTO notifications (user_id, type, title, message, reference_id) VALUES (?, ?, ?, ?, ?)',
        [submission.student_id, 'grade_posted',
         `Bài tập "${submission.assignment_title}" đã được chấm điểm`,
         `Điểm: ${score}${feedback ? `. Nhận xét: ${feedback.substring(0, 100)}` : ''}`,
         submission.id]
      );
    } catch (_) {
      // Notifications are best-effort.
    }

    return res.json({ message: 'Submission graded successfully' });
  } catch (error) {
    return handleError(error, res);
  }
};

// --- STATISTICS ---

exports.getAssignmentStats = async (req, res) => {
  try {
    const assignment = await resolveAssignment(db, req.params.id);
    requireOwnerOrAdmin(req.user, assignment);
    const [submissions] = await db.query(
      `SELECT s.*, u.name as student_name FROM assignment_submissions s
       JOIN users u ON s.student_id = u.id WHERE s.assignment_id = ?`,
      [assignment.id]
    );
    const [enrolled] = await db.query(
      'SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?',
      [assignment.course_id]
    );

    const totalStudents = Number(enrolled[0]?.count || 0);
    const submittedStudents = new Set(submissions.map(submission => submission.student_id)).size;
    const gradedSubmissions = submissions.filter(submission => submission.status === 'graded');
    const scores = gradedSubmissions
      .filter(submission => submission.score !== null)
      .map(submission => Number(submission.score));

    return res.json({
      total_students: totalStudents,
      submitted_count: submittedStudents,
      not_submitted_count: totalStudents - submittedStudents,
      graded_count: gradedSubmissions.length,
      pending_count: submissions.filter(submission => submission.status === 'submitted').length,
      completion_rate: totalStudents > 0
        ? Math.round((submittedStudents / totalStudents) * 100)
        : 0,
      average_score: scores.length > 0
        ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10
        : 0,
      highest_score: scores.length > 0 ? Math.max(...scores) : 0,
      lowest_score: scores.length > 0 ? Math.min(...scores) : 0,
      total_points: assignment.total_points,
    });
  } catch (error) {
    return handleError(error, res);
  }
};

// --- NOTIFICATIONS ---

exports.getNotifications = async (req, res) => {
  try {
    const [notifications] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    const [unreadCount] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    return res.json({
      notifications,
      unread_count: Number(unreadCount[0]?.count || 0),
    });
  } catch (error) {
    return handleError(error, res);
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    if (req.params.notifId === 'all') {
      await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
    } else {
      const notificationId = parseId(req.params.notifId, 'Notification ID');
      await db.query(
        'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
        [notificationId, req.user.id]
      );
    }
    return res.json({ message: 'Marked as read' });
  } catch (error) {
    return handleError(error, res);
  }
};

// --- GRADEBOOK ---

exports.getCourseGrades = async (req, res) => {
  try {
    const course = await resolveCourse(db, req.params.courseId);
    requireOwnerOrAdmin(req.user, course);

    const [students] = await db.query(
      `SELECT u.id, u.name, u.email
       FROM users u
       JOIN enrollments e ON u.id = e.student_id
       WHERE e.course_id = ?`,
      [course.id]
    );
    const [assignments] = await db.query(
      'SELECT id, title, total_points FROM assignments WHERE course_id = ?',
      [course.id]
    );
    const [submissions] = await db.query(
      `SELECT s.student_id, s.assignment_id, s.score
       FROM assignment_submissions s
       JOIN assignments a ON s.assignment_id = a.id
       WHERE a.course_id = ? AND s.status = 'graded'`,
      [course.id]
    );

    const studentMap = {};
    students.forEach(student => {
      studentMap[student.id] = { ...student, grades: {} };
    });
    submissions.forEach(submission => {
      if (!studentMap[submission.student_id]) return;
      const score = Number(submission.score);
      const currentScore = studentMap[submission.student_id].grades[submission.assignment_id];
      if (currentScore === undefined || score > currentScore) {
        studentMap[submission.student_id].grades[submission.assignment_id] = score;
      }
    });

    const [lessons] = await db.query('SELECT id FROM lessons WHERE course_id = ?', [course.id]);
    const totalLessons = lessons.length;
    if (totalLessons > 0) {
      const [progress] = await db.query(
        `SELECT p.student_id, COUNT(DISTINCT p.lesson_id) as count
         FROM lesson_progress p
         JOIN lessons l ON p.lesson_id = l.id
         WHERE l.course_id = ? AND p.completed = TRUE
         GROUP BY p.student_id`,
        [course.id]
      );
      progress.forEach(item => {
        if (studentMap[item.student_id]) {
          studentMap[item.student_id].progress = Math.round(
            (Number(item.count) / totalLessons) * 100
          );
        }
      });
    }

    Object.values(studentMap).forEach(student => {
      if (student.progress === undefined) student.progress = 0;
    });
    return res.json({ assignments, students: Object.values(studentMap) });
  } catch (error) {
    return handleError(error, res);
  }
};
