const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const { afterEach, test } = require('node:test');

const courseControllerPath = path.resolve(__dirname, '../controllers/courseController.js');
const enrollmentControllerPath = path.resolve(__dirname, '../controllers/enrollmentController.js');
const authMiddlewarePath = path.resolve(__dirname, '../middleware/authMiddleware.js');

function loadModule(modulePath, mocks) {
  delete require.cache[modulePath];
  const originalLoad = Module._load;
  Module._load = function loadWithMocks(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require(modulePath);
  } finally {
    Module._load = originalLoad;
  }
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

afterEach(() => {
  delete require.cache[courseControllerPath];
  delete require.cache[enrollmentControllerPath];
  delete require.cache[authMiddlewarePath];
});

test('optional authentication permits no-token metadata requests without a database lookup', async () => {
  let queryCalls = 0;
  const { optionalAuth } = loadModule(authMiddlewarePath, {
    jsonwebtoken: {},
    '../config/db': {
      async query() {
        queryCalls += 1;
        return [[]];
      },
    },
  });
  const res = createResponse();
  let nextCalls = 0;

  await optionalAuth({ headers: {} }, res, () => { nextCalls += 1; });

  assert.equal(nextCalls, 1);
  assert.equal(queryCalls, 0);
  assert.equal(res.body, undefined);
});

test('optional authentication does not downgrade an invalid token to anonymous', async () => {
  let queryCalls = 0;
  const { optionalAuth } = loadModule(authMiddlewarePath, {
    jsonwebtoken: {
      verify() {
        throw new Error('bad signature');
      },
    },
    '../config/db': {
      async query() {
        queryCalls += 1;
        return [[]];
      },
    },
  });
  const res = createResponse();
  let nextCalls = 0;

  await optionalAuth(
    { headers: { authorization: 'Bearer invalid' } },
    res,
    () => { nextCalls += 1; }
  );

  assert.equal(nextCalls, 0);
  assert.equal(queryCalls, 0);
  assert.equal(res.statusCode, 401);
});

test('public course detail returns metadata without querying or exposing curriculum', async () => {
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      return [[{
        id: 12,
        title: 'Public metadata',
        lecturer_id: 4,
        lecturer_name: 'Teacher',
        lesson_count: '3',
      }]];
    },
  };
  const { getCourseById } = loadModule(courseControllerPath, { '../config/db': db });
  const res = createResponse();

  await getCourseById({ params: { id: '12' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 1);
  assert.equal(res.body.has_full_access, false);
  assert.deepEqual(res.body.chapters, []);
  assert.deepEqual(res.body.lessons, []);
  assert.deepEqual(res.body.assignments, []);
  assert.doesNotMatch(JSON.stringify(res.body), /video_url|file_url|package_url|content/);
});

test('an enrolled student receives full curriculum', async () => {
  const calls = [];
  const responses = [
    [[{ id: 12, title: 'Private curriculum', lecturer_id: 4 }]],
    [[{ id: 91 }]],
    [[{ id: 2, course_id: 12, title: 'Chapter', chapter_order: 1 }]],
    [[{
      id: 7,
      course_id: 12,
      chapter_id: 2,
      title: 'Lesson',
      content: 'Protected body',
      file_url: 'https://private.example/file',
    }]],
    [[]],
  ];
  const db = { query: async (sql) => { calls.push(sql); return responses.shift(); } };
  const { getCourseById } = loadModule(courseControllerPath, { '../config/db': db });
  const res = createResponse();

  await getCourseById({
    params: { id: '12' },
    user: { id: 8, role: 'student' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.has_full_access, true);
  assert.equal(res.body.lessons[0].content, 'Protected body');
  assert.equal(res.body.lessons[0].file_url, '/api/files/lessons/7/access');
  assert.doesNotMatch(JSON.stringify(res.body), /https:\/\/private\.example\/file/);
  assert.equal(res.body.chapters[0].lessons[0].id, 7);
  assert.match(calls.at(-1), /status = 'published'/);
});

test('course database failures return a stable message without raw details', async () => {
  const db = {
    async query() {
      throw new Error('password authentication failed for user secret_admin');
    },
  };
  const { getCourses } = loadModule(courseControllerPath, { '../config/db': db });
  const res = createResponse();

  await getCourses({ query: {} }, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { message: 'Internal server error' });
});

test('a non-owner lecturer cannot read a course roster', async () => {
  let calls = 0;
  const db = {
    async query() {
      calls += 1;
      return [[{ id: 15, title: 'Other course', lecturer_id: 99 }]];
    },
  };
  const { getCourseStudents } = loadModule(enrollmentControllerPath, { '../config/db': db });
  const res = createResponse();

  await getCourseStudents({
    params: { courseId: '15' },
    user: { id: 5, role: 'lecturer' },
  }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(calls, 1);
  assert.deepEqual(res.body, { message: 'Not authorized for this course' });
});

test('student progress rejects a student relation outside the owned course', async () => {
  const responses = [
    [[{ id: 15, title: 'Owned course', lecturer_id: 5 }]],
    [[]],
  ];
  const db = { query: async () => responses.shift() };
  const { getStudentProgress } = loadModule(enrollmentControllerPath, { '../config/db': db });
  const res = createResponse();

  await getStudentProgress({
    params: { courseId: '15', studentId: '44' },
    user: { id: 5, role: 'lecturer' },
  }, res);

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { message: 'Student is not enrolled in this course' });
});

test('enrollment ignores no caller identity and rejects enrolling another student', async () => {
  let calls = 0;
  const db = { query: async () => { calls += 1; return [[]]; } };
  const { enroll } = loadModule(enrollmentControllerPath, { '../config/db': db });
  const res = createResponse();

  await enroll({
    body: { course_id: 15, student_id: 999 },
    user: { id: 8, role: 'student' },
  }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(calls, 0);
  assert.deepEqual(res.body, { message: 'Students may only enroll themselves' });
});

test('paid courses cannot be self-enrolled without payment confirmation', async () => {
  const calls = [];
  const db = {
    async query(sql) {
      calls.push(sql);
      return [[{ id: 15, lecturer_id: 5, price: '199000' }]];
    },
  };
  const { enroll } = loadModule(enrollmentControllerPath, { '../config/db': db });
  const res = createResponse();

  await enroll({
    body: { course_id: 15 },
    user: { id: 8, role: 'student' },
  }, res);

  assert.equal(res.statusCode, 402);
  assert.match(res.body.message, /payment is required/i);
  assert.equal(calls.length, 1);
});

test('admin course deletion removes private and public storage assets after the database row', async () => {
  const queries = [];
  const deletedFiles = [];
  const deletedPrefixes = [];
  const db = {
    async query(sql) {
      queries.push(sql.replace(/\s+/g, ' ').trim());
      if (sql.startsWith('SELECT * FROM courses')) {
        return [[{ id: 12, lecturer_id: 4, thumbnail_url: 'https://cdn.test/thumb.png' }]];
      }
      if (sql.startsWith('SELECT file_url, file_type FROM lessons')) {
        return [[
          { file_url: 'r2://lesson-files/notes.pdf', file_type: 'pdf' },
          { file_url: 'r2://packages/lesson-abc/index.html', file_type: 'package' },
        ]];
      }
      if (/SELECT s\.file_url FROM assignment_submissions/.test(sql)) {
        return [[{ file_url: 'r2://submission-files/work.pdf' }]];
      }
      return [[]];
    },
  };
  const { deleteCourse } = loadModule(courseControllerPath, {
    '../config/db': db,
    '../config/storage': {
      deleteStoredFile: async (locator) => { deletedFiles.push(locator); },
      deleteStoragePrefix: async (prefix, options) => { deletedPrefixes.push({ prefix, options }); },
      packagePrefixFromLocator: () => 'packages/lesson-abc/',
      uploadToStorage: async () => 'unused',
    },
  });
  const res = createResponse();

  await deleteCourse({
    params: { id: '12' },
    user: { id: 1, role: 'admin' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.ok(queries.some((sql) => sql === 'DELETE FROM courses WHERE id = ?'));
  assert.deepEqual(new Set(deletedFiles), new Set([
    'https://cdn.test/thumb.png',
    'r2://lesson-files/notes.pdf',
    'r2://submission-files/work.pdf',
  ]));
  assert.deepEqual(deletedPrefixes, [{
    prefix: 'packages/lesson-abc/',
    options: { privateBucket: true },
  }]);
});
