const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');

const { createApp } = require('../app');
const { validateRuntimeConfig } = require('../config/runtime');

async function withServer(app, callback) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function testApp(env = {}, registerRoutes) {
  return createApp({
    env: { NODE_ENV: 'test', ...env },
    mountDefaultRoutes: false,
    serveStatic: false,
    logger: false,
    registerRoutes,
  });
}

test('health endpoint and security headers are available without loading application routes', async () => {
  await withServer(testApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(response.headers.get('x-powered-by'), null);
  });
});

test('CORS permits configured origins and rejects all other browser origins', async () => {
  await withServer(testApp({ ALLOWED_ORIGINS: 'https://lms.example' }), async (baseUrl) => {
    const allowed = await fetch(`${baseUrl}/health`, { headers: { Origin: 'https://lms.example' } });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://lms.example');

    const rejected = await fetch(`${baseUrl}/health`, { headers: { Origin: 'https://evil.example' } });
    assert.equal(rejected.status, 403);
    assert.deepEqual(await rejected.json(), {
      code: 'CORS_ORIGIN_DENIED',
      message: 'Origin is not allowed by CORS policy',
    });
  });
});

test('API and authentication limiters return bounded JSON errors', async () => {
  const app = testApp(
    { API_RATE_LIMIT_MAX: '2', AUTH_RATE_LIMIT_MAX: '1' },
    (target) => {
      target.post('/api/auth/login', (req, res) => res.json({ ok: true }));
      target.get('/api/test', (req, res) => res.json({ ok: true }));
    },
  );

  await withServer(app, async (baseUrl) => {
    const login = () => fetch(`${baseUrl}/api/auth/login`, { method: 'POST' });
    assert.equal((await login()).status, 200);
    const authLimited = await login();
    assert.equal(authLimited.status, 429);
    assert.equal((await authLimited.json()).code, 'AUTH_RATE_LIMITED');

    assert.equal((await fetch(`${baseUrl}/api/test`)).status, 200);
    const apiLimited = await fetch(`${baseUrl}/api/test`);
    assert.equal(apiLimited.status, 429);
    assert.equal((await apiLimited.json()).code, 'RATE_LIMITED');
    assert.ok(apiLimited.headers.get('retry-after'));
  });
});

test('invalid and oversized JSON receive the centralized error shape', async () => {
  const router = express.Router();
  router.post('/echo', (req, res) => res.json(req.body));
  const app = createApp({
    env: { NODE_ENV: 'test', JSON_BODY_LIMIT: '20b' },
    routes: [['/api', router]],
    serveStatic: false,
    logger: false,
  });

  await withServer(app, async (baseUrl) => {
    const invalid = await fetch(`${baseUrl}/api/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad',
    });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).code, 'INVALID_JSON');

    const oversized = await fetch(`${baseUrl}/api/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'more than twenty bytes' }),
    });
    assert.equal(oversized.status, 413);
    assert.equal((await oversized.json()).code, 'PAYLOAD_TOO_LARGE');
  });
});

test('unknown routes return JSON and production configuration fails closed', async () => {
  await withServer(testApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/does-not-exist`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { code: 'NOT_FOUND', message: 'Route not found' });
  });

  assert.throws(
    () => validateRuntimeConfig({ NODE_ENV: 'production' }),
    /DATABASE_URL, JWT_SECRET, ALLOWED_ORIGINS/,
  );
  assert.throws(
    () => validateRuntimeConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://example',
      JWT_SECRET: 'short',
      ALLOWED_ORIGINS: 'https://lms.example',
      R2_ACCOUNT_ID: 'account',
      R2_ACCESS_KEY_ID: 'access-key',
      R2_SECRET_ACCESS_KEY: 'secret-key',
      R2_BUCKET_NAME: 'lms-files',
      R2_PRIVATE_BUCKET_NAME: 'lms-private-files',
      R2_PUBLIC_URL: 'https://assets.example',
    }),
    /at least 32 characters/,
  );

  assert.doesNotThrow(() => validateRuntimeConfig({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://example',
    JWT_SECRET: 'a-secure-production-secret-with-32-characters',
    ALLOWED_ORIGINS: 'https://lms.example',
    R2_ACCOUNT_ID: 'account',
    R2_ACCESS_KEY_ID: 'access-key',
    R2_SECRET_ACCESS_KEY: 'secret-key',
    R2_BUCKET_NAME: 'lms-files',
    R2_PRIVATE_BUCKET_NAME: 'lms-private-files',
    R2_PUBLIC_URL: 'https://assets.example',
  }));
});
