const db = require('../config/db');

// --- ASSIGNMENTS ---

exports.createAssignment = async (req, res) => {
  const { title, description, chapter_id, type, total_points, due_date,
          status, shuffle_questions, shuffle_options, time_limit, max_attempts, allow_resubmit } = req.body;
  const course_id = req.params.courseId;
  try {
    const [result] = await db.query(
      `INSERT INTO assignments (course_id, chapter_id, title, description, type, total_points, due_date,
        status, shuffle_questions, shuffle_options, time_limit, max_attempts, allow_resubmit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [course_id, chapter_id, title, description, type, total_points || 100, due_date || null,
       status || 'published', shuffle_questions || false, shuffle_options || false,
       time_limit || null, max_attempts || 1, allow_resubmit || false]
    );

    // Send notifications to enrolled students
    if ((status || 'published') === 'published') {
      try {
        const [students] = await db.query(
          'SELECT student_id FROM enrollments WHERE course_id = ?', [course_id]
        );
        const notifType = type === 'quiz' ? 'quiz_posted' : 'assignment_posted';
        for (const s of students) {
          await db.query(
            'INSERT INTO notifications (user_id, type, title, message, reference_id) VALUES (?, ?, ?, ?, ?)',
            [s.student_id, notifType, `Bài ${type === 'quiz' ? 'quiz' : 'tập'} mới: ${title}`,
             description ? description.substring(0, 200) : '', result[0].id]
          );
        }
      } catch (e) { /* notifications are optional, don't fail the request */ }
    }

    res.status(201).json({ id: result[0].id, message: 'Assignment created successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateAssignment = async (req, res) => {
  const { title, description, type, total_points, due_date,
          status, shuffle_questions, shuffle_options, time_limit, max_attempts, allow_resubmit } = req.body;
  try {
    await db.query(
      `UPDATE assignments SET title = ?, description = ?, type = ?, total_points = ?, due_date = ?,
        status = ?, shuffle_questions = ?, shuffle_options = ?, time_limit = ?, max_attempts = ?, allow_resubmit = ?
       WHERE id = ?`,
      [title, description, type, total_points || 100, due_date || null,
       status || 'published', shuffle_questions || false, shuffle_options || false,
       time_limit || null, max_attempts || 1, allow_resubmit || false, req.params.id]
    );
    res.json({ message: 'Assignment updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAssignments = async (req, res) => {
  try {
    const { status: filterStatus } = req.query;
    let query = 'SELECT * FROM assignments WHERE course_id = ?';
    const params = [req.params.courseId];

    // Students should only see published assignments
    if (req.user.role === 'student') {
      query += " AND status = 'published'";
    } else if (filterStatus) {
      query += ' AND status = ?';
      params.push(filterStatus);
    }

    query += ' ORDER BY created_at DESC';
    const [assignments] = await db.query(query, params);

    // For students, attach their submission info
    if (req.user.role === 'student') {
      for (const a of assignments) {
        const [subs] = await db.query(
          `SELECT id, score, status, submitted_at, attempt_number FROM assignment_submissions
           WHERE assignment_id = ? AND student_id = ? ORDER BY submitted_at DESC`,
          [a.id, req.user.id]
        );
        a.my_submissions = subs;
        a.submission_count = subs.length;
        if (subs.length > 0) {
          a.best_score = Math.max(...subs.filter(s => s.score !== null).map(s => s.score), 0);
          a.latest_status = subs[0].status;
        }
      }
    }

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAssignmentById = async (req, res) => {
  try {
    const [assignments] = await db.query('SELECT * FROM assignments WHERE id = ?', [req.params.id]);
    if (assignments.length === 0) return res.status(404).json({ message: 'Assignment not found' });
    
    const assignment = assignments[0];
    if (assignment.type === 'quiz') {
      // Check if student already submitted — if so, include correct_option for review
      let includeAnswer = true;
      if (req.user.role === 'student') {
        const [subs] = await db.query(
          'SELECT id FROM assignment_submissions WHERE assignment_id = ? AND student_id = ? LIMIT 1',
          [assignment.id, req.user.id]
        );
        includeAnswer = subs.length > 0;
      }
      const fields = includeAnswer
        ? 'id, question_text, question_type, options, correct_option, correct_answer, points, question_order'
        : 'id, question_text, question_type, options, points, question_order';
      const [questions] = await db.query(`SELECT ${fields} FROM assignment_questions WHERE assignment_id = ? ORDER BY question_order, id`, [assignment.id]);
      assignment.questions = questions.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
      }));

      // Shuffle questions if enabled (and not reviewing)
      if (assignment.shuffle_questions && !includeAnswer) {
        assignment.questions = shuffleArray(assignment.questions);
      }
      // Shuffle options if enabled (and not reviewing)
      if (assignment.shuffle_options && !includeAnswer) {
        // Note: We can't easily shuffle options for already-graded submissions since correct_option is index-based
        // For new attempts, we send a shuffle map
      }
    }
    
    // Check student submissions and attempt count
    if (req.user.role === 'student') {
      const [submissions] = await db.query(
        `SELECT * FROM assignment_submissions WHERE assignment_id = ? AND student_id = ? ORDER BY submitted_at DESC`,
        [assignment.id, req.user.id]
      );
      if (submissions.length > 0) {
        assignment.my_submissions = submissions.map(s => ({
          ...s,
          answers: typeof s.answers === 'string' ? JSON.parse(s.answers) : s.answers
        }));
        assignment.my_submission = assignment.my_submissions[0];
        assignment.attempt_count = submissions.length;
        assignment.best_score = Math.max(...submissions.filter(s => s.score !== null).map(s => s.score), 0);
      } else {
        assignment.attempt_count = 0;
      }
    }
    
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper: Shuffle array (Fisher-Yates)
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

exports.deleteAssignment = async (req, res) => {
  try {
    await db.query('DELETE FROM assignments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Assignment deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- QUESTIONS ---

exports.addQuestion = async (req, res) => {
  const { question_text, question_type, options, correct_option, correct_answer, points, question_order } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO assignment_questions (assignment_id, question_text, question_type, options, correct_option, correct_answer, points, question_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [req.params.id, question_text, question_type || 'multiple_choice',
       JSON.stringify(options || []), correct_option || 0, correct_answer || null, points || 10, question_order || 0]
    );
    res.status(201).json({ id: result[0].id, message: 'Question added' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateQuestion = async (req, res) => {
  const { question_text, question_type, options, correct_option, correct_answer, points, question_order } = req.body;
  try {
    await db.query(
      `UPDATE assignment_questions SET question_text = ?, question_type = ?, options = ?, correct_option = ?, correct_answer = ?, points = ?, question_order = ? WHERE id = ?`,
      [question_text, question_type || 'multiple_choice',
       JSON.stringify(options || []), correct_option || 0, correct_answer || null, points || 10, question_order || 0, req.params.questionId]
    );
    res.json({ message: 'Question updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.bulkSaveQuestions = async (req, res) => {
  const { questions } = req.body;
  const assignment_id = req.params.id;
  try {
    // Delete all existing questions for this assignment
    await db.query('DELETE FROM assignment_questions WHERE assignment_id = ?', [assignment_id]);
    
    // Insert all new questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await db.query(
        `INSERT INTO assignment_questions (assignment_id, question_text, question_type, options, correct_option, correct_answer, points, question_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [assignment_id, q.question_text, q.question_type || 'multiple_choice',
         JSON.stringify(q.options || []), q.correct_option || 0, q.correct_answer || null, q.points || 10, q.question_order || i]
      );
    }
    
    // Return the newly created questions
    const [saved] = await db.query(
      'SELECT id, question_text, question_type, options, correct_option, correct_answer, points, question_order FROM assignment_questions WHERE assignment_id = ? ORDER BY question_order, id',
      [assignment_id]
    );
    const result = saved.map(q => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
    }));
    
    res.json({ message: `${questions.length} questions saved`, questions: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    // Check if user is authorized (instructor/admin who owns the course)
    const [question] = await db.query(`
      SELECT aq.*, a.course_id, c.lecturer_id 
      FROM assignment_questions aq
      JOIN assignments a ON aq.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      WHERE aq.id = ?
    `, [req.params.questionId]);
    
    if (question.length === 0) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    if (question[0].lecturer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await db.query('DELETE FROM assignment_questions WHERE id = ?', [req.params.questionId]);
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- SUBMISSIONS & GRADING ---

exports.submitAssignment = async (req, res) => {
  const { content, answers } = req.body; // 'content' for essay, 'answers' for quiz (JSON obj)
  const assignment_id = req.params.id;
  const student_id = req.user.id;

  try {
    const [assignments] = await db.query('SELECT * FROM assignments WHERE id = ?', [assignment_id]);
    if (assignments.length === 0) return res.status(404).json({ message: 'Assignment not found' });
    const assignment = assignments[0];

    // Check Due Date
    if (assignment.due_date && new Date() > new Date(assignment.due_date)) {
      return res.status(403).json({ message: 'Assignment due date has passed. You cannot submit it anymore.' });
    }

    // Check attempt limit
    const [existingSubs] = await db.query(
      'SELECT COUNT(*) as count FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?',
      [assignment_id, student_id]
    );
    const attemptCount = existingSubs[0].count;

    if (assignment.type === 'essay' && attemptCount > 0 && !assignment.allow_resubmit) {
      return res.status(403).json({ message: 'You have already submitted this assignment and resubmission is not allowed.' });
    }

    if (assignment.type === 'quiz' && assignment.max_attempts > 0 && attemptCount >= assignment.max_attempts) {
      return res.status(403).json({ message: `You have reached the maximum number of attempts (${assignment.max_attempts}).` });
    }

    if (assignment.type === 'quiz') {
      // Auto-Grade Quiz
      const [questions] = await db.query('SELECT * FROM assignment_questions WHERE assignment_id = ?', [assignment_id]);
      
      let score = 0;
      let total_possible = 0;
      const questionResults = [];
      
      questions.forEach(q => {
        total_possible += q.points;
        const studentAnswer = answers ? answers[q.id] : undefined;
        let isCorrect = false;

        switch (q.question_type || 'multiple_choice') {
          case 'multiple_choice':
          case 'true_false':
            isCorrect = studentAnswer !== undefined && studentAnswer == q.correct_option;
            break;
          case 'fill_blank':
            if (q.correct_answer && studentAnswer) {
              isCorrect = studentAnswer.toString().trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
            }
            break;
          case 'essay':
            // Essay questions in a quiz are not auto-graded
            isCorrect = false; // Will need manual grading
            break;
        }

        if (isCorrect) {
          score += q.points;
        }

        questionResults.push({
          id: q.id,
          question_type: q.question_type || 'multiple_choice',
          correct_option: q.correct_option,
          correct_answer: q.correct_answer,
          is_correct: isCorrect,
          points: q.points
        });
      });
      
      // Check if there are essay-type questions that need manual grading
      const hasEssayQuestions = questions.some(q => (q.question_type || 'multiple_choice') === 'essay');
      
      // Auto-scale score to total_points of the assignment
      const final_score = total_possible > 0 ? Math.round((score / total_possible) * assignment.total_points) : 0;
      const submissionStatus = hasEssayQuestions ? 'submitted' : 'graded';

      await db.query(
        `INSERT INTO assignment_submissions (assignment_id, student_id, answers, score, status, attempt_number) VALUES (?, ?, ?, ?, ?, ?)`,
        [assignment_id, student_id, JSON.stringify(answers), final_score, submissionStatus, attemptCount + 1]
      );

      // Send notification to instructor
      try {
        const [course] = await db.query(
          'SELECT c.lecturer_id, c.title as course_title FROM courses c JOIN assignments a ON c.id = a.course_id WHERE a.id = ?',
          [assignment_id]
        );
        if (course.length > 0) {
          const [student] = await db.query('SELECT name FROM users WHERE id = ?', [student_id]);
          await db.query(
            'INSERT INTO notifications (user_id, type, title, message, reference_id) VALUES (?, ?, ?, ?, ?)',
            [course[0].lecturer_id, 'submission_received',
             `${student[0]?.name || 'Học sinh'} đã nộp bài quiz: ${assignment.title}`,
             `Điểm: ${final_score}/${assignment.total_points}`, assignment_id]
          );
        }
      } catch (e) { /* notifications are optional */ }

      res.status(201).json({
        message: hasEssayQuestions ? 'Quiz submitted. Some questions require manual grading.' : 'Quiz graded successfully',
        score: final_score,
        total: assignment.total_points,
        question_results: questionResults,
        attempt_number: attemptCount + 1
      });
    } else {
      // Essay submission
      let file_url = null;
      if (req.file) {
        file_url = `/uploads/${req.file.filename}`;
      }

      // If resubmitting, update existing or insert new
      await db.query(
        `INSERT INTO assignment_submissions (assignment_id, student_id, content, file_url, status, attempt_number) VALUES (?, ?, ?, ?, ?, ?)`,
        [assignment_id, student_id, content, file_url, 'submitted', attemptCount + 1]
      );

      // Send notification to instructor
      try {
        const [course] = await db.query(
          'SELECT c.lecturer_id, c.title as course_title FROM courses c JOIN assignments a ON c.id = a.course_id WHERE a.id = ?',
          [assignment_id]
        );
        if (course.length > 0) {
          const [student] = await db.query('SELECT name FROM users WHERE id = ?', [student_id]);
          await db.query(
            'INSERT INTO notifications (user_id, type, title, message, reference_id) VALUES (?, ?, ?, ?, ?)',
            [course[0].lecturer_id, 'submission_received',
             `${student[0]?.name || 'Học sinh'} đã nộp bài tập: ${assignment.title}`,
             '', assignment_id]
          );
        }
      } catch (e) { /* notifications are optional */ }

      res.status(201).json({ message: 'Essay submitted successfully. Waiting for grading.', attempt_number: attemptCount + 1 });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSubmissions = async (req, res) => {
  try {
    const [submissions] = await db.query(`
      SELECT s.*, u.name as student_name, u.email as student_email 
      FROM assignment_submissions s
      JOIN users u ON s.student_id = u.id
      WHERE s.assignment_id = ?
      ORDER BY s.submitted_at DESC
    `, [req.params.id]);
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get student's own submission history for an assignment
exports.getMySubmissions = async (req, res) => {
  try {
    const [submissions] = await db.query(
      `SELECT * FROM assignment_submissions WHERE assignment_id = ? AND student_id = ? ORDER BY submitted_at DESC`,
      [req.params.id, req.user.id]
    );
    res.json(submissions.map(s => ({
      ...s,
      answers: typeof s.answers === 'string' ? JSON.parse(s.answers) : s.answers
    })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all assignments for current student across all enrolled courses
exports.getMyAllAssignments = async (req, res) => {
  try {
    const [assignments] = await db.query(`
      SELECT a.*, c.title as course_title 
      FROM assignments a
      JOIN enrollments e ON a.course_id = e.course_id
      JOIN courses c ON a.course_id = c.id
      WHERE e.student_id = ? AND a.status = 'published'
      ORDER BY a.due_date ASC
    `, [req.user.id]);

    for (const a of assignments) {
      const [subs] = await db.query(
        `SELECT id, score, status, submitted_at, attempt_number FROM assignment_submissions
         WHERE assignment_id = ? AND student_id = ? ORDER BY submitted_at DESC`,
        [a.id, req.user.id]
      );
      a.my_submissions = subs;
      a.submission_count = subs.length;
      if (subs.length > 0) {
        a.best_score = Math.max(...subs.filter(s => s.score !== null).map(s => s.score), 0);
        a.latest_status = subs[0].status;
      }
    }

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.gradeSubmission = async (req, res) => {
  const { score, feedback } = req.body;
  try {
    await db.query(
      'UPDATE assignment_submissions SET score = ?, feedback = ?, status = ? WHERE id = ?',
      [score, feedback, 'graded', req.params.subId]
    );

    // Send notification to student
    try {
      const [sub] = await db.query(
        `SELECT s.student_id, a.title FROM assignment_submissions s 
         JOIN assignments a ON s.assignment_id = a.id WHERE s.id = ?`,
        [req.params.subId]
      );
      if (sub.length > 0) {
        await db.query(
          'INSERT INTO notifications (user_id, type, title, message, reference_id) VALUES (?, ?, ?, ?, ?)',
          [sub[0].student_id, 'grade_posted',
           `Bài tập "${sub[0].title}" đã được chấm điểm`,
           `Điểm: ${score}${feedback ? '. Nhận xét: ' + feedback.substring(0, 100) : ''}`,
           req.params.subId]
        );
      }
    } catch (e) { /* notifications are optional */ }

    res.json({ message: 'Submission graded successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- STATISTICS ---

exports.getAssignmentStats = async (req, res) => {
  const assignmentId = req.params.id;
  try {
    const [assignment] = await db.query('SELECT * FROM assignments WHERE id = ?', [assignmentId]);
    if (assignment.length === 0) return res.status(404).json({ message: 'Assignment not found' });

    const [submissions] = await db.query(
      `SELECT s.*, u.name as student_name FROM assignment_submissions s 
       JOIN users u ON s.student_id = u.id WHERE s.assignment_id = ?`,
      [assignmentId]
    );

    // Get total enrolled students
    const [enrolled] = await db.query(
      'SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?',
      [assignment[0].course_id]
    );

    const totalStudents = enrolled[0].count;
    const submittedStudents = new Set(submissions.map(s => s.student_id)).size;
    const gradedSubmissions = submissions.filter(s => s.status === 'graded');
    const scores = gradedSubmissions.filter(s => s.score !== null).map(s => s.score);

    const stats = {
      total_students: totalStudents,
      submitted_count: submittedStudents,
      not_submitted_count: totalStudents - submittedStudents,
      graded_count: gradedSubmissions.length,
      pending_count: submissions.filter(s => s.status === 'submitted').length,
      completion_rate: totalStudents > 0 ? Math.round((submittedStudents / totalStudents) * 100) : 0,
      average_score: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0,
      highest_score: scores.length > 0 ? Math.max(...scores) : 0,
      lowest_score: scores.length > 0 ? Math.min(...scores) : 0,
      total_points: assignment[0].total_points
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    res.json({ notifications, unread_count: unreadCount[0].count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    if (req.params.notifId === 'all') {
      await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
    } else {
      await db.query('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [req.params.notifId, req.user.id]);
    }
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- GRADEBOOK ---

exports.getCourseGrades = async (req, res) => {
  const course_id = req.params.courseId;
  try {
    // Get all students enrolled
    const [students] = await db.query(`
      SELECT u.id, u.name, u.email 
      FROM users u
      JOIN enrollments e ON u.id = e.student_id
      WHERE e.course_id = ?
    `, [course_id]);

    // Get all assignments in the course
    const [assignments] = await db.query('SELECT id, title, total_points FROM assignments WHERE course_id = ?', [course_id]);

    // Get all 'graded' submissions for the course (we keep the latest/highest grade for each assignment per student)
    const [submissions] = await db.query(`
      SELECT s.student_id, s.assignment_id, s.score 
      FROM assignment_submissions s
      JOIN assignments a ON s.assignment_id = a.id
      WHERE a.course_id = ? AND s.status = 'graded'
    `, [course_id]);

    const studentMap = {};
    students.forEach(s => {
      studentMap[s.id] = {
        ...s,
        grades: {} // map of assignment_id -> score
      };
    });

    submissions.forEach(sub => {
      if (studentMap[sub.student_id]) {
        // If retaking is allowed, only store the highest score
        const current_score = studentMap[sub.student_id].grades[sub.assignment_id];
        if (current_score === undefined || sub.score > current_score) {
          studentMap[sub.student_id].grades[sub.assignment_id] = sub.score;
        }
      }
    });

    // Also get progress %
    const [lessons] = await db.query('SELECT id FROM lessons WHERE course_id = ?', [course_id]);
    const totalLessons = lessons.length;

    if (totalLessons > 0) {
      const [progress] = await db.query(`
        SELECT p.student_id, COUNT(p.id) as count
        FROM lesson_progress p
        JOIN lessons l ON p.lesson_id = l.id
        WHERE l.course_id = ?
        GROUP BY p.student_id
      `, [course_id]);
      
      progress.forEach(p => {
        if (studentMap[p.student_id]) {
          studentMap[p.student_id].progress = Math.round((p.count / totalLessons) * 100);
        }
      });
    }

    // Populate default 0% progress
    Object.values(studentMap).forEach(s => {
      if (s.progress === undefined) s.progress = 0;
    });

    res.json({
      assignments,
      students: Object.values(studentMap)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
