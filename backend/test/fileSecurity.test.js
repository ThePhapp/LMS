const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createApp } = require('../app');
const { openPackageAsset } = require('../config/storage');
const { authorizeSubmission } = require('../controllers/fileController');
const { issueFileTicket, verifyFileTicket } = require('../services/fileTickets');
const { validateUploadedBuffer, validateUploadedFile } = require('../utils/fileValidation');

async function withTempFile(name, content, callback) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'lms-file-test-'));
  const filePath = path.join(directory, name);
  try {
    await fs.writeFile(filePath, content);
    return await callback(filePath);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

async function withServer(app, callback) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    return await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('file validation accepts matching magic bytes and rejects extension spoofing', async () => {
  await withTempFile('document.pdf', Buffer.from('%PDF-1.7\ncontent'), async (filePath) => {
    const result = await validateUploadedFile(filePath, 'document.pdf', 'assignment');
    assert.equal(result.mimeType, 'application/pdf');
  });

  await withTempFile('spoofed.pdf', Buffer.from('this is plain text'), async (filePath) => {
    await assert.rejects(
      validateUploadedFile(filePath, 'spoofed.pdf', 'assignment'),
      (error) => error.code === 'FILE_TYPE_MISMATCH' && error.statusCode === 415,
    );
  });
});

test('assignment upload policy rejects executable and SVG extensions', async () => {
  await withTempFile('payload.svg', Buffer.from('<svg></svg>'), async (filePath) => {
    await assert.rejects(
      validateUploadedFile(filePath, 'payload.svg', 'assignment'),
      (error) => error.code === 'FILE_TYPE_NOT_ALLOWED',
    );
  });
  await withTempFile('payload.exe', Buffer.from('MZ'), async (filePath) => {
    await assert.rejects(
      validateUploadedFile(filePath, 'payload.exe', 'assignment'),
      (error) => error.code === 'FILE_TYPE_NOT_ALLOWED',
    );
  });
});

test('avatar and thumbnail validation accepts real images and rejects renamed markup', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  assert.equal(validateUploadedBuffer(png, 'avatar.png').mimeType, 'image/png');
  assert.throws(
    () => validateUploadedBuffer(Buffer.from('<svg onload="alert(1)"></svg>'), 'avatar.png'),
    (error) => error.code === 'FILE_TYPE_MISMATCH',
  );
});

test('file tickets are short-lived capabilities bound to kind and resource', () => {
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-file-ticket-secret-that-is-long-enough';
  try {
    const ticket = issueFileTicket({ kind: 'lesson', resourceId: 7, userId: 9 });
    assert.deepEqual(verifyFileTicket(ticket, { kind: 'lesson', resourceId: 7 }), { userId: 9 });
    assert.throws(
      () => verifyFileTicket(ticket, { kind: 'submission', resourceId: 7 }),
      (error) => error.code === 'FILE_TICKET_INVALID' && error.statusCode === 401,
    );
    assert.throws(
      () => verifyFileTicket(ticket, { kind: 'lesson', resourceId: 8 }),
      (error) => error.code === 'FILE_TICKET_INVALID',
    );
  } finally {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
});

test('submission files are limited to their student, owning lecturer, or admin', () => {
  const submission = { student_id: 9, lecturer_id: 4 };
  assert.doesNotThrow(() => authorizeSubmission({ id: 9, role: 'student' }, submission));
  assert.doesNotThrow(() => authorizeSubmission({ id: 4, role: 'lecturer' }, submission));
  assert.doesNotThrow(() => authorizeSubmission({ id: 2, role: 'admin' }, submission));
  assert.throws(
    () => authorizeSubmission({ id: 10, role: 'student' }, submission),
    (error) => error.status === 403,
  );
  assert.throws(
    () => authorizeSubmission({ id: 5, role: 'lecturer' }, submission),
    (error) => error.status === 403,
  );
});

test('legacy upload paths are no longer served as public static files', async () => {
  const app = createApp({
    env: { NODE_ENV: 'test' },
    mountDefaultRoutes: false,
    logger: false,
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/uploads/guessed-submission.pdf`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { code: 'NOT_FOUND', message: 'Route not found' });
  });
});

test('package content rejects missing tickets and traversal before storage access', async () => {
  await assert.rejects(
    openPackageAsset('r2://packages/lesson-7/index.html', '../secret.txt'),
    (error) => error.code === 'STORAGE_PATH_INVALID' && error.statusCode === 422,
  );

  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'package-route-test-secret-that-is-long-enough';
  const app = createApp({
    env: { NODE_ENV: 'test' },
    routes: [['/api/files', require('../routes/files')]],
    logger: false,
  });
  try {
    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/files/packages/7/index.html`);
      assert.equal(response.status, 401);
      assert.equal((await response.json()).code, 'FILE_TICKET_INVALID');
    });
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
