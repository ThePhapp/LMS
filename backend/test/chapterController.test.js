const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const { afterEach, test } = require('node:test');

const controllerPath = path.resolve(__dirname, '../controllers/chapterController.js');

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
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

afterEach(() => delete require.cache[controllerPath]);

test('chapter creation validates input before insert', async () => {
  const calls = [];
  const controller = loadController({
    async query(sql) {
      calls.push(sql);
      return [[{ id: 12, lecturer_id: 4 }]];
    },
  });
  const res = createResponse();

  await controller.createChapter({
    body: { course_id: 12, title: '   ', chapter_order: -1 },
    user: { id: 4, role: 'lecturer' },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /title is required/i);
  assert.equal(calls.some((sql) => sql.startsWith('INSERT INTO chapters')), false);
});

test('chapter updates require ownership and preserve omitted fields', async () => {
  const calls = [];
  const controller = loadController({
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT id, course_id')) {
        return [[{ id: 7, course_id: 12, title: 'Old title', chapter_order: 3 }]];
      }
      if (sql.startsWith('SELECT * FROM courses')) {
        return [[{ id: 12, lecturer_id: 4 }]];
      }
      return [[]];
    },
  });
  const res = createResponse();

  await controller.updateChapter({
    params: { id: '7' },
    body: { title: '  New title  ' },
    user: { id: 4, role: 'lecturer' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls.at(-1).params, ['New title', 3, 7]);
  assert.equal(res.body.title, 'New title');
  assert.equal(res.body.chapter_order, 3);
});

test('chapter database failures do not expose raw error details', async () => {
  const controller = loadController({
    async query() {
      throw new Error('password authentication failed for secret_admin');
    },
  });
  const res = createResponse();

  await controller.deleteChapter({
    params: { id: '7' },
    user: { id: 4, role: 'lecturer' },
  }, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { message: 'Internal server error' });
});
