const test = require('node:test');
const assert = require('node:assert/strict');

const dbPath = require.resolve('../config/db');
const mockDb = {
  query: async () => {
    throw new Error('Unexpected database query');
  },
  withTransaction: async () => {
    throw new Error('Unexpected transaction');
  },
};

// Inject the mock before loading the controller. This avoids loading dotenv/pg.
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: mockDb,
};

const controller = require('../controllers/assignmentController');

function normalized(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test.beforeEach(() => {
  mockDb.query = async () => {
    throw new Error('Unexpected database query');
  };
  mockDb.withTransaction = async () => {
    throw new Error('Unexpected transaction');
  };
});

test('createAssignment denies a lecturer who does not own the course', async () => {
  const queries = [];
  mockDb.query = async sql => {
    queries.push(normalized(sql));
    return [[{ id: 10, lecturer_id: 99 }]];
  };
  const res = createResponse();

  await controller.createAssignment({
    params: { courseId: '10' },
    user: { id: 5, role: 'lecturer' },
    body: { title: 'Forbidden assignment', chapter_id: 3, type: 'quiz' },
  }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Not authorized');
  assert.equal(queries.length, 1);
  assert.match(queries[0], /^SELECT \* FROM courses/);
  assert.ok(!queries.some(sql => sql.startsWith('INSERT INTO assignments')));
});

test('student assignment read requires enrollment and hides quiz answers while attempts remain', async () => {
  let questionQuery;
  mockDb.query = async sql => {
    const query = normalized(sql);
    if (query.startsWith('SELECT a.*, c.lecturer_id')) {
      return [[{
        id: 11,
        course_id: 10,
        lecturer_id: 5,
        type: 'quiz',
        status: 'published',
        max_attempts: 3,
        shuffle_questions: false,
      }]];
    }
    if (query.startsWith('SELECT id FROM enrollments')) return [[{ id: 50 }]];
    if (query.startsWith('SELECT * FROM assignment_submissions')) {
      return [[{ id: 70, score: 80, answers: '{"1":0}', status: 'graded' }]];
    }
    if (query.includes('FROM assignment_questions')) {
      questionQuery = query;
      return [[{
        id: 1,
        question_text: 'Question',
        question_type: 'multiple_choice',
        options: '["A","B"]',
        points: 10,
        question_order: 0,
      }]];
    }
    throw new Error(`Unexpected query: ${query}`);
  };
  const res = createResponse();

  await controller.getAssignmentById({
    params: { id: '11' },
    user: { id: 9, role: 'student' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.attempt_count, 1);
  assert.ok(questionQuery);
  assert.ok(!questionQuery.includes('correct_option'));
  assert.ok(!questionQuery.includes('correct_answer'));
  assert.ok(!Object.hasOwn(res.body.questions[0], 'correct_option'));
  assert.ok(!Object.hasOwn(res.body.questions[0], 'correct_answer'));
});

test('student assignment read rejects an unenrolled student before loading submissions', async () => {
  const queries = [];
  mockDb.query = async sql => {
    const query = normalized(sql);
    queries.push(query);
    if (query.startsWith('SELECT a.*, c.lecturer_id')) {
      return [[{
        id: 11,
        course_id: 10,
        lecturer_id: 5,
        type: 'quiz',
        status: 'published',
        max_attempts: 1,
      }]];
    }
    if (query.startsWith('SELECT id FROM enrollments')) return [[]];
    throw new Error(`Unexpected query: ${query}`);
  };
  const res = createResponse();

  await controller.getAssignmentById({
    params: { id: '11' },
    user: { id: 9, role: 'student' },
  }, res);

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /not enrolled/i);
  assert.ok(!queries.some(sql => sql.includes('FROM assignment_submissions')));
});

test('student assignment read rejects an unpublished assignment', async () => {
  const queries = [];
  mockDb.query = async sql => {
    const query = normalized(sql);
    queries.push(query);
    if (query.startsWith('SELECT a.*, c.lecturer_id')) {
      return [[{
        id: 11,
        course_id: 10,
        lecturer_id: 5,
        type: 'quiz',
        status: 'draft',
        max_attempts: 1,
      }]];
    }
    throw new Error(`Unexpected query: ${query}`);
  };
  const res = createResponse();

  await controller.getAssignmentById({
    params: { id: '11' },
    user: { id: 9, role: 'student' },
  }, res);

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /not published/i);
  assert.equal(queries.length, 1);
});

test('bulk question replacement is transaction-scoped and rolls back on insert failure', async () => {
  const original = [{ id: 1, question_text: 'Original' }];
  let persisted = original.map(item => ({ ...item }));
  let sawAssignmentLock = false;

  mockDb.withTransaction = async callback => {
    let working = persisted.map(item => ({ ...item }));
    let insertCount = 0;
    const transaction = {
      query: async sql => {
        const query = normalized(sql);
        if (query.startsWith('SELECT a.*, c.lecturer_id')) {
          sawAssignmentLock = query.includes('FOR UPDATE OF a');
          return [[{
            id: 11,
            course_id: 10,
            lecturer_id: 5,
            type: 'quiz',
            status: 'published',
          }]];
        }
        if (query.startsWith('DELETE FROM assignment_questions')) {
          working = [];
          return [[]];
        }
        if (query.startsWith('INSERT INTO assignment_questions')) {
          insertCount += 1;
          if (insertCount === 2) throw new Error('simulated insert failure');
          working.push({ id: 2, question_text: 'First replacement' });
          return [[]];
        }
        throw new Error(`Unexpected query: ${query}`);
      },
    };

    const result = await callback(transaction);
    persisted = working;
    return result;
  };
  const res = createResponse();

  await controller.bulkSaveQuestions({
    params: { id: '11' },
    user: { id: 5, role: 'lecturer' },
    body: {
      questions: [
        { question_text: 'First replacement', options: ['A', 'B'], correct_option: 0, points: 10 },
        { question_text: 'Second replacement', options: ['A', 'B'], correct_option: 1, points: 10 },
      ],
    },
  }, res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.message, 'Unable to process assignment request');
  assert.equal(sawAssignmentLock, true);
  assert.deepEqual(persisted, original);
});

test('quiz submission atomically numbers attempts and never returns correct answers', async () => {
  const transactionQueries = [];
  let insertedSubmission;
  mockDb.withTransaction = async callback => callback({
    query: async (sql, params) => {
      const query = normalized(sql);
      transactionQueries.push(query);
      if (query.startsWith('SELECT a.*, c.lecturer_id')) {
        return [[{
          id: 11,
          course_id: 10,
          lecturer_id: 5,
          title: 'Quiz',
          type: 'quiz',
          status: 'published',
          max_attempts: 3,
          total_points: 100,
          due_date: null,
        }]];
      }
      if (query.startsWith('SELECT id FROM enrollments')) return [[{ id: 50 }]];
      if (query.startsWith('SELECT COUNT(*)')) return [[{ count: '1' }]];
      if (query.startsWith('SELECT * FROM assignment_questions')) {
        return [[{
          id: 1,
          question_type: 'multiple_choice',
          correct_option: 1,
          correct_answer: 'secret',
          points: 10,
        }]];
      }
      if (query.startsWith('INSERT INTO assignment_submissions')) {
        insertedSubmission = params;
        return [[]];
      }
      throw new Error(`Unexpected query: ${query}`);
    },
  });
  mockDb.query = async sql => {
    const query = normalized(sql);
    if (query.startsWith('SELECT name FROM users')) return [[{ name: 'Student' }]];
    if (query.startsWith('INSERT INTO notifications')) return [[]];
    throw new Error(`Unexpected post-commit query: ${query}`);
  };
  const res = createResponse();

  await controller.submitAssignment({
    params: { id: '11' },
    user: { id: 9, role: 'student' },
    body: { answers: { 1: 1 } },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.attempt_number, 2);
  assert.equal(res.body.score, 100);
  assert.equal(insertedSubmission[5], 2);
  assert.ok(transactionQueries[0].includes('FOR SHARE OF a'));
  assert.ok(transactionQueries.some(query => (
    query.startsWith('SELECT id FROM enrollments') && query.endsWith('FOR UPDATE')
  )));
  assert.ok(!Object.hasOwn(res.body, 'question_results'));
});

test('grading requires assignment ownership and a score within total_points', async () => {
  let updateCount = 0;
  mockDb.query = async sql => {
    const query = normalized(sql);
    if (query.startsWith('SELECT s.*, a.course_id')) {
      return [[{
        id: 80,
        assignment_id: 11,
        student_id: 9,
        assignment_title: 'Essay',
        total_points: 100,
        lecturer_id: 99,
      }]];
    }
    if (query.startsWith('UPDATE assignment_submissions')) {
      updateCount += 1;
      return [[]];
    }
    throw new Error(`Unexpected query: ${query}`);
  };
  const denied = createResponse();

  await controller.gradeSubmission({
    params: { subId: '80' },
    user: { id: 5, role: 'lecturer' },
    body: { score: 50 },
  }, denied);

  assert.equal(denied.statusCode, 403);
  assert.equal(updateCount, 0);

  mockDb.query = async sql => {
    const query = normalized(sql);
    if (query.startsWith('SELECT s.*, a.course_id')) {
      return [[{
        id: 80,
        assignment_id: 11,
        student_id: 9,
        assignment_title: 'Essay',
        total_points: 100,
        lecturer_id: 5,
      }]];
    }
    if (query.startsWith('UPDATE assignment_submissions')) {
      updateCount += 1;
      return [[]];
    }
    throw new Error(`Unexpected query: ${query}`);
  };
  const invalidScore = createResponse();

  await controller.gradeSubmission({
    params: { subId: '80' },
    user: { id: 5, role: 'lecturer' },
    body: { score: 101 },
  }, invalidScore);

  assert.equal(invalidScore.statusCode, 400);
  assert.match(invalidScore.body.message, /between 0 and 100/);
  assert.equal(updateCount, 0);
});

test('gradebook progress counts only distinct completed lessons and converts pg counts', async () => {
  let progressQuery;
  mockDb.query = async sql => {
    const query = normalized(sql);
    if (query.startsWith('SELECT * FROM courses')) return [[{ id: 10, lecturer_id: 5 }]];
    if (query.startsWith('SELECT u.id, u.name, u.email')) {
      return [[{ id: 9, name: 'Student', email: 'student@example.test' }]];
    }
    if (query.startsWith('SELECT id, title, total_points FROM assignments')) return [[]];
    if (query.startsWith('SELECT s.student_id, s.assignment_id, s.score')) return [[]];
    if (query.startsWith('SELECT id FROM lessons')) return [[{ id: 1 }, { id: 2 }]];
    if (query.startsWith('SELECT p.student_id, COUNT(DISTINCT p.lesson_id)')) {
      progressQuery = query;
      return [[{ student_id: 9, count: '1' }]];
    }
    throw new Error(`Unexpected query: ${query}`);
  };
  const res = createResponse();

  await controller.getCourseGrades({
    params: { courseId: '10' },
    user: { id: 5, role: 'lecturer' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.students[0].progress, 50);
  assert.match(progressQuery, /COUNT\(DISTINCT p\.lesson_id\)/);
  assert.match(progressQuery, /p\.completed = TRUE/);
});
