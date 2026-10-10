const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const { afterEach, test } = require('node:test');

const controllerPath = path.resolve(__dirname, '../controllers/authController.js');
const jwtEnvironmentKeys = [
  'JWT_SECRET',
  'JWT_ISSUER',
  'JWT_AUDIENCE',
  'JWT_ACCESS_TTL',
];
const originalEnvironment = Object.fromEntries(
  jwtEnvironmentKeys.map((key) => [key, process.env[key]])
);

const loadController = (mocks) => {
  delete require.cache[controllerPath];
  const originalLoad = Module._load;

  Module._load = function loadWithMocks(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request];
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require(controllerPath);
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
  delete require.cache[controllerPath];
  for (const key of jwtEnvironmentKeys) {
    if (originalEnvironment[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnvironment[key];
    }
  }
});

test('register always creates a student and signs a short HS256 access token', async () => {
  process.env.JWT_SECRET = 'test-secret';
  delete process.env.JWT_ISSUER;
  delete process.env.JWT_AUDIENCE;
  delete process.env.JWT_ACCESS_TTL;

  const queries = [];
  const signCalls = [];
  const db = {
    async query(sql, params) {
      queries.push({ sql, params });
      return queries.length === 1 ? [[]] : [[{ id: 17 }]];
    },
  };
  const bcrypt = {
    genSalt: async () => 'salt',
    hash: async (password, salt) => {
      assert.equal(password, 'strong-pass');
      assert.equal(salt, 'salt');
      return 'hashed-password';
    },
  };
  const jwt = {
    sign(payload, secret, options) {
      signCalls.push({ payload, secret, options });
      return 'signed-token';
    },
  };
  const { register } = loadController({
    '../config/db': db,
    bcryptjs: bcrypt,
    jsonwebtoken: jwt,
  });
  const res = createResponse();

  await register({
    body: {
      name: '  Alice Example  ',
      email: '  ALICE@Example.COM ',
      password: 'strong-pass',
      role: 'admin',
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, {
    id: 17,
    name: 'Alice Example',
    email: 'alice@example.com',
    role: 'student',
    avatar_url: null,
    token: 'signed-token',
  });
  assert.deepEqual(queries, [
    {
      sql: 'SELECT * FROM users WHERE email = ?',
      params: ['alice@example.com'],
    },
    {
      sql: 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?) RETURNING id',
      params: ['Alice Example', 'alice@example.com', 'hashed-password', 'student'],
    },
  ]);
  assert.deepEqual(signCalls, [{
    payload: { id: 17, role: 'student' },
    secret: 'test-secret',
    options: {
      algorithm: 'HS256',
      issuer: 'lms-api',
      audience: 'lms-client',
      expiresIn: '15m',
    },
  }]);
});

test('register rejects invalid name, email, and password before querying the database', async () => {
  let queryCount = 0;
  const { register } = loadController({
    '../config/db': {
      async query() {
        queryCount += 1;
        return [[]];
      },
    },
    bcryptjs: {},
    jsonwebtoken: {},
  });
  const invalidBodies = [
    null,
    { name: '   ', email: 'alice@example.com', password: 'strong-pass' },
    { name: 'Alice', email: 'not-an-email', password: 'strong-pass' },
    { name: 'Alice', email: 'alice@example.com', password: 'short' },
  ];

  for (const body of invalidBodies) {
    const res = createResponse();
    await register({ body }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(typeof res.body.message, 'string');
  }

  assert.equal(queryCount, 0);
});

test('login uses configurable issuer, audience, and access token TTL', async () => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_ISSUER = 'custom-issuer';
  process.env.JWT_AUDIENCE = 'custom-audience';
  process.env.JWT_ACCESS_TTL = '10m';

  let signCall;
  const { login } = loadController({
    '../config/db': {
      async query() {
        return [[{
          id: 4,
          name: 'Lecturer',
          email: 'lecturer@example.com',
          password: 'stored-hash',
          role: 'lecturer',
          avatar_url: null,
        }]];
      },
    },
    bcryptjs: {
      compare: async () => true,
    },
    jsonwebtoken: {
      sign(payload, secret, options) {
        signCall = { payload, secret, options };
        return 'signed-token';
      },
    },
  });
  const res = createResponse();

  await login({ body: { email: ' LECTURER@example.com ', password: 'password' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(signCall, {
    payload: { id: 4, role: 'lecturer' },
    secret: 'test-secret',
    options: {
      algorithm: 'HS256',
      issuer: 'custom-issuer',
      audience: 'custom-audience',
      expiresIn: '10m',
    },
  });
});

test('login rejects malformed credentials before querying the database', async () => {
  let queryCount = 0;
  const { login } = loadController({
    '../config/db': {
      async query() {
        queryCount += 1;
        return [[]];
      },
    },
    bcryptjs: {},
    jsonwebtoken: {},
  });

  for (const body of [null, {}, { email: 'bad', password: 'password' }, { email: 'a@example.com' }]) {
    const res = createResponse();
    await login({ body }, res);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { message: 'Invalid credentials' });
  }

  assert.equal(queryCount, 0);
});
