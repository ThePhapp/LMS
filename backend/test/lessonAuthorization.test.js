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
        uploadPrivateFileToStorage: async () => 'unused',
        uploadDirectoryToStorage: async () => ({ url: 'unused', keys: [] }),
        deleteStorageKeys: async () => {},
        packageEntryPath: () => 'index.html',
        packagePrefixFromLocator: () => null,
        deleteStoragePrefix: async () => {},
        deleteStoredFile: async () => {},
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
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
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

test('package info issues an HttpOnly ticket and never exposes its storage locator', async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'package-ticket-test-secret-that-is-long-enough';
  const responses = [
    [[{ id: 7, course_id: 12, lecturer_id: 4 }]],
    [[{ id: 91 }]],
    [[{
      id: 7,
      file_type: 'package',
      file_url: 'r2://packages/lesson-private/index.html',
      file_name: 'lesson.zip',
    }]],
  ];
  const db = { query: async () => responses.shift() };
  const { getPackageInfo } = loadController(db);
  const res = createResponse();

  try {
    await getPackageInfo({
      params: { lessonId: '7' },
      user: { id: 8, role: 'student' },
    }, res);
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.packageUrl, '/api/files/packages/7/index.html');
  assert.match(res.headers['set-cookie'], /HttpOnly/);
  assert.match(res.headers['set-cookie'], /Path=\/api\/files\/packages\/7/);
  assert.doesNotMatch(JSON.stringify(res.body), /r2:\/\//);
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

test('lesson creation rejects unsafe video URLs before insert', async () => {
  const calls = [];
  const db = {
    async query(sql) {
      calls.push(sql);
      return [[{ lecturer_id: 4 }]];
    },
  };
  const { createLesson } = loadController(db);
  const res = createResponse();

  await createLesson({
    body: {
      course_id: 12,
      title: 'Unsafe link',
      video_url: 'javascript:alert(document.domain)',
    },
    user: { id: 4, role: 'lecturer' },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /valid HTTP\(S\) URL/i);
  assert.equal(calls.some((sql) => /INSERT INTO lessons/i.test(sql)), false);
});

test('lesson update can intentionally clear optional text fields', async () => {
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (/SELECT l\.\*, c\.lecturer_id/.test(sql)) {
        return [[{
          id: 7,
          course_id: 12,
          chapter_id: 3,
          lecturer_id: 4,
          title: 'Existing',
          content: 'Old content',
          video_url: 'https://example.test/video',
          lesson_order: 2,
          duration: '45',
          file_url: null,
          file_name: null,
          file_type: null,
        }]];
      }
      return [[]];
    },
  };
  const { updateLesson } = loadController(db);
  const res = createResponse();

  await updateLesson({
    params: { id: '7' },
    body: { content: '', video_url: '', duration: '' },
    user: { id: 4, role: 'lecturer' },
  }, res);

  assert.equal(res.statusCode, 200);
  const update = calls.find(({ sql }) => sql.startsWith('UPDATE lessons'));
  assert.ok(update);
  assert.equal(update.params[2], null);
  assert.equal(update.params[3], null);
  assert.equal(update.params[8], null);
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
