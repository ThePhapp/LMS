const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const { afterEach, test } = require('node:test');

const middlewarePath = path.resolve(__dirname, '../middleware/authMiddleware.js');
const jwtEnvironmentKeys = ['JWT_SECRET', 'JWT_ISSUER', 'JWT_AUDIENCE'];
const originalEnvironment = Object.fromEntries(
  jwtEnvironmentKeys.map((key) => [key, process.env[key]])
);

const loadMiddleware = (mocks) => {
  delete require.cache[middlewarePath];
  const originalLoad = Module._load;

  Module._load = function loadWithMocks(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request];
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require(middlewarePath);
  } finally {
    Module._load = originalLoad;
  }
};

const createResponse = () => ({
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
});

afterEach(() => {
  delete require.cache[middlewarePath];
  for (const key of jwtEnvironmentKeys) {
    if (originalEnvironment[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnvironment[key];
    }
  }
});

test('protect pins JWT verification and replaces a forged role claim with the database role', async () => {
  process.env.JWT_SECRET = 'test-secret';
  delete process.env.JWT_ISSUER;
  delete process.env.JWT_AUDIENCE;

  let verifyCall;
  let queryCall;
  const { protect, authorize } = loadMiddleware({
    jsonwebtoken: {
      verify(token, secret, options) {
        verifyCall = { token, secret, options };
        return { id: 7, role: 'admin' };
      },
    },
    '../config/db': {
      async query(sql, params) {
        queryCall = { sql, params };
        return [[{ id: 7, role: 'student' }]];
      },
    },
  });
  const req = { headers: { authorization: 'Bearer signed-token' } };
  const res = createResponse();
  let nextCalls = 0;

  await protect(req, res, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 1);
  assert.deepEqual(verifyCall, {
    token: 'signed-token',
    secret: 'test-secret',
    options: {
      algorithms: ['HS256'],
      issuer: 'lms-api',
      audience: 'lms-client',
    },
  });
  assert.deepEqual(queryCall, {
    sql: 'SELECT id, role FROM users WHERE id = ?',
    params: [7],
  });
  assert.deepEqual(req.user, {
    id: 7,
    role: 'student',
    token: 'signed-token',
  });

  const denied = createResponse();
  let adminNextCalls = 0;
  authorize('admin')(req, denied, () => {
    adminNextCalls += 1;
  });
  assert.equal(adminNextCalls, 0);
  assert.equal(denied.statusCode, 403);

  let studentNextCalls = 0;
  authorize('student')(req, createResponse(), () => {
    studentNextCalls += 1;
  });
  assert.equal(studentNextCalls, 1);
});

test('protect rejects a valid token when its user no longer exists', async () => {
  const { protect } = loadMiddleware({
    jsonwebtoken: {
      verify: () => ({ id: 9, role: 'admin' }),
    },
    '../config/db': {
      query: async () => [[]],
    },
  });
  const req = { headers: { authorization: 'Bearer signed-token' } };
  const res = createResponse();
  let nextCalls = 0;

  await protect(req, res, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 0);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { message: 'Not authorized, user not found' });
});

test('protect rejects failed JWT verification without querying the database', async () => {
  let queryCalls = 0;
  const { protect } = loadMiddleware({
    jsonwebtoken: {
      verify() {
        throw new Error('invalid signature');
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

  await protect(
    { headers: { authorization: 'Bearer bad-token' } },
    res,
    () => assert.fail('next should not be called')
  );

  assert.equal(queryCalls, 0);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { message: 'Not authorized, token failed' });
});
