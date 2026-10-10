const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const { afterEach, test } = require('node:test');

const controllerPath = path.resolve(__dirname, '../controllers/eventController.js');

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

test('admin event filtering creates a WHERE clause before date predicates', async () => {
  const calls = [];
  const controller = loadController({
    async query(sql, params) {
      calls.push({ sql, params });
      return [[]];
    },
  });
  const res = createResponse();

  await controller.getEvents({
    user: { id: 1, role: 'admin' },
    query: { startDetail: '2026-10-01T00:00:00Z', endDetail: '2026-11-01T00:00:00Z' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.match(calls[0].sql, /WHERE e\.start_time >= \? AND e\.start_time <= \?/);
  assert.deepEqual(calls[0].params, ['2026-10-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z']);
});

test('rejects incomplete or reversed date ranges before querying', async () => {
  let queryCount = 0;
  const controller = loadController({
    async query() { queryCount += 1; return [[]]; },
  });

  for (const query of [
    { startDetail: '2026-10-01T00:00:00Z' },
    { startDetail: '2026-11-01T00:00:00Z', endDetail: '2026-10-01T00:00:00Z' },
  ]) {
    const res = createResponse();
    await controller.getEvents({ user: { id: 1, role: 'admin' }, query }, res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(queryCount, 0);
});

test('admin-created events retain the owning lecturer', async () => {
  const calls = [];
  const controller = loadController({
    async query(sql, params) {
      calls.push({ sql, params });
      if (calls.length === 1) return [[{ id: 9, lecturer_id: 44 }]];
      return [[{ id: 81 }]];
    },
  });
  const res = createResponse();

  await controller.createEvent({
    user: { id: 1, role: 'admin' },
    body: {
      course_id: 9,
      title: 'Office hours',
      start_time: '2026-10-12T08:00:00Z',
      end_time: '2026-10-12T09:00:00Z',
      event_type: 'lecture',
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.lecturer_id, 44);
  assert.equal(calls[1].params[1], 44);
});

test('lecturer cannot create an event for another lecturer course', async () => {
  let insertCount = 0;
  const controller = loadController({
    async query(sql) {
      if (sql.startsWith('INSERT')) insertCount += 1;
      return [[{ id: 9, lecturer_id: 44 }]];
    },
  });
  const res = createResponse();

  await controller.createEvent({
    user: { id: 12, role: 'lecturer' },
    body: {
      course_id: 9,
      title: 'Office hours',
      start_time: '2026-10-12T08:00:00Z',
      end_time: '2026-10-12T09:00:00Z',
      event_type: 'lecture',
    },
  }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(insertCount, 0);
});
