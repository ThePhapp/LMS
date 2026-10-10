const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const { afterEach, test } = require('node:test');

const controllerPath = path.resolve(__dirname, '../controllers/interactionController.js');

function loadController(db) {
  delete require.cache[controllerPath];
  const originalLoad = Module._load;
  Module._load = function loadWithMocks(request, parent, isMain) {
    if (request === '../config/db') return db;
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require(controllerPath);
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

afterEach(() => delete require.cache[controllerPath]);

test('comment replies reject a parent from another lesson before insert', async () => {
  const calls = [];
  const responses = [
    [[{ id: 7, course_id: 12, lecturer_id: 4 }]],
    [[{ id: 81 }]],
    [[]],
  ];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      return responses.shift();
    },
  };
  const { addComment } = loadController(db);
  const res = createResponse();

  await addComment({
    params: { lessonId: '7' },
    body: { content: 'Reply', parent_id: 45 },
    user: { id: 8, role: 'student' },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { message: 'Parent comment must belong to the same lesson' });
  assert.equal(calls.length, 3);
  assert.doesNotMatch(calls.at(-1).sql, /INSERT/i);
});

test('course-linked forum detail denies anonymous access before updating views', async () => {
  const calls = [];
  const responses = [
    [[{ id: 3, course_id: 12, views: 4 }]],
    [[{ id: 12, lecturer_id: 4 }]],
  ];
  const db = {
    async query(sql) {
      calls.push(sql);
      return responses.shift();
    },
  };
  const { getForumById } = loadController(db);
  const res = createResponse();

  await getForumById({ params: { id: '3' } }, res);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { message: 'Not authorized for this course' });
  assert.equal(calls.length, 2);
  assert.equal(calls.some((sql) => /UPDATE forum_topics/i.test(sql)), false);
});

test('course comments require enrollment and do not run the comments query when denied', async () => {
  const calls = [];
  const responses = [
    [[{ id: 7, course_id: 12, lecturer_id: 4 }]],
    [[]],
  ];
  const db = {
    async query(sql) {
      calls.push(sql);
      return responses.shift();
    },
  };
  const { getComments } = loadController(db);
  const res = createResponse();

  await getComments({
    params: { lessonId: '7' },
    user: { id: 8, role: 'student' },
  }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(calls.length, 2);
  assert.equal(calls.some((sql) => /FROM comments c/i.test(sql)), false);
});

test('interaction database failures never expose raw errors', async () => {
  const db = {
    async query() {
      throw new Error('relation internal_private_table does not exist');
    },
  };
  const { getForums } = loadController(db);
  const res = createResponse();

  await getForums({ query: {} }, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { message: 'Internal server error' });
});
