const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const { afterEach, test } = require('node:test');

const controllerPath = path.resolve(__dirname, '../controllers/lessonController.js');

function loadController(db) {
  delete require.cache[controllerPath];
  const originalLoad = Module._load;
  Module._load = function loadWithMocks(request, parent, isMain) {
    if (request === '../config/db') return db;
    if (request === '../config/storage') {
      return {
        uploadFileToStorage: async () => 'unused',
        uploadDirectoryToStorage: async () => ({ url: 'unused', keys: [] }),
        deleteStorageKeys: async () => {},
      };
    }
    if (request === '../utils/zipHandler') {
      return {
        extractPackageFromFile: async () => ({ success: false }),
        cleanupPackage: async () => {},
      };
    }
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

test('package info rejects an unenrolled student before returning its URL', async () => {
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
  const { getPackageInfo } = loadController(db);
  const res = createResponse();

  await getPackageInfo({
    params: { lessonId: '7' },
    user: { id: 8, role: 'student' },
  }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(calls.length, 2);
  assert.doesNotMatch(calls.at(-1), /file_url/);
});

test('lesson creation rejects a chapter from another course before insert', async () => {
  const calls = [];
  const responses = [
    [[{ lecturer_id: 4 }]],
    [[]],
  ];
  const db = {
    async query(sql) {
      calls.push(sql);
      return responses.shift();
    },
  };
  const { createLesson } = loadController(db);
  const res = createResponse();

  await createLesson({
    body: { course_id: 12, chapter_id: 99, title: 'Cross-course lesson' },
    user: { id: 4, role: 'lecturer' },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /does not belong/i);
  assert.equal(calls.some((sql) => /INSERT INTO lessons/i.test(sql)), false);
});

test('only enrolled students may mark progress', async () => {
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
  const { markProgress } = loadController(db);
  const res = createResponse();

  await markProgress({
    body: { lesson_id: 7, completed: true },
    user: { id: 8, role: 'student' },
  }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(calls.some((sql) => /INSERT INTO lesson_progress/i.test(sql)), false);
});
