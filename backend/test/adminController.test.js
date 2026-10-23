const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const { afterEach, test } = require('node:test');

const controllerPath = path.resolve(__dirname, '../controllers/adminController.js');

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

test('admin dashboard loads independent aggregates concurrently and normalizes counts', async () => {
  const pending = [];
  const rowsByQuery = new Map([
    ['SELECT COUNT(*) as count FROM users', [{ count: '12' }]],
    ['SELECT COUNT(*) as count FROM courses', [{ count: '4' }]],
    ['SELECT COUNT(*) as count FROM enrollments', [{ count: '37' }]],
    ['SELECT id, name, email, role, avatar_url FROM users ORDER BY id DESC', [{ id: 1 }]],
  ]);
  const controller = loadController({
    query(sql) {
      return new Promise((resolve) => pending.push(() => resolve([rowsByQuery.get(sql)])));
    },
  });
  const res = createResponse();
  const request = controller.getDashboardStats({}, res);

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(pending.length, 4);
  pending.forEach((resolve) => resolve());
  await request;

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.stats, {
    totalUsers: 12,
    totalCourses: 4,
    totalEnrollments: 37,
  });
  assert.deepEqual(res.body.users, [{ id: 1 }]);
});

test('admin endpoints do not expose database error details', async () => {
  const controller = loadController({
    async query() {
      throw new Error('password authentication failed for secret_admin');
    },
  });
  const res = createResponse();

  await controller.getAdminCourses({}, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { message: 'Unable to load administration data' });
});
