const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { createPoolConfig, getSslConfig } = require('../config/postgres');
const db = require('../config/db');
const {
  loadMigrations,
  migrationPlan,
  runMigrations,
} = require('../db/migrationRunner');
const {
  REQUIRED_CONSTRAINTS,
  REQUIRED_INDEXES,
  REQUIRED_TABLES,
  assertSchema,
  inspectSchema,
} = require('../db/schemaCheck');

test.after(() => db.close());

test('PostgreSQL TLS defaults to certificate verification and rejects unsafe production settings', () => {
  assert.equal(getSslConfig({ DATABASE_URL: 'postgres://localhost/lms' }), false);
  assert.deepEqual(
    getSslConfig({ DATABASE_URL: 'postgres://db.example/lms' }),
    { rejectUnauthorized: true },
  );
  assert.throws(
    () => getSslConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://db.example/lms',
      DATABASE_SSL: 'disable',
    }),
    /not allowed/,
  );
  assert.throws(
    () => getSslConfig({
      DATABASE_URL: 'postgres://db.example/lms',
      DATABASE_SSL: 'require',
    }),
    /ALLOW_INSECURE/,
  );
  assert.deepEqual(
    getSslConfig({
      DATABASE_URL: 'postgres://db.example/lms',
      DATABASE_SSL: 'require',
      DATABASE_SSL_ALLOW_INSECURE: 'true',
    }),
    { rejectUnauthorized: false },
  );
  assert.equal(createPoolConfig({ DATABASE_URL: 'postgres://localhost/lms' }).max, 10);
});

test('legacy placeholders are converted without changing literals or comments', () => {
  const sql = "SELECT '?' AS literal, value FROM items WHERE id = ? -- ?\nAND name = ? /* ? */";
  assert.equal(
    db.toPostgres(sql),
    "SELECT '?' AS literal, value FROM items WHERE id = $1 -- ?\nAND name = $2 /* ? */",
  );
});

test('migration files are ordered PostgreSQL-only schema changes with stable checksums', async () => {
  const migrations = await loadMigrations(path.resolve(__dirname, '../db/migrations'));
  assert.deepEqual(migrations.map((migration) => migration.id), ['001', '002']);
  for (const migration of migrations) {
    assert.match(migration.checksum, /^[a-f0-9]{64}$/);
    assert.doesNotMatch(migration.sql, /AUTO_INCREMENT|\bENUM\s*\(|INFORMATION_SCHEMA\.COLUMNS/i);
  }
  assert.match(migrations[1].sql, /assignment_submissions_attempt_uidx/);
  assert.match(migrations[1].sql, /lessons_chapter_course_fk/);
});

test('migration runner applies each pending file atomically under an advisory lock', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT id, checksum')) return { rows: [] };
      return { rows: [] };
    },
  };
  const migrations = [
    { id: '001', fileName: '001_test.sql', sql: 'SELECT 1', checksum: 'a'.repeat(64) },
  ];

  const plan = await runMigrations(client, { migrations, logger: { log() {} } });
  assert.equal(plan[0].status, 'pending');
  const statements = calls.map((call) => call.sql.trim());
  assert.match(statements[0], /pg_advisory_lock/);
  assert.ok(statements.includes('BEGIN'));
  assert.ok(statements.includes('SELECT 1'));
  assert.ok(statements.includes('COMMIT'));
  assert.match(statements.at(-1), /pg_advisory_unlock/);
  const insert = calls.find((call) => call.sql.startsWith('INSERT INTO schema_migrations'));
  assert.deepEqual(insert.params, ['001', '001_test.sql', 'a'.repeat(64)]);
});

test('migration runner rolls back a failed migration and rejects edited history', async () => {
  const statements = [];
  const client = {
    async query(sql) {
      statements.push(sql.trim());
      if (sql.startsWith('SELECT id, checksum')) return { rows: [] };
      if (sql === 'BROKEN SQL') throw new Error('syntax failure');
      return { rows: [] };
    },
  };
  await assert.rejects(
    runMigrations(client, {
      migrations: [{ id: '003', fileName: '003_broken.sql', sql: 'BROKEN SQL', checksum: 'b'.repeat(64) }],
      logger: { log() {} },
    }),
    /syntax failure/,
  );
  assert.ok(statements.includes('ROLLBACK'));
  assert.match(statements.at(-1), /pg_advisory_unlock/);

  assert.throws(
    () => migrationPlan(
      [{ id: '001', fileName: '001_test.sql', checksum: 'a'.repeat(64) }],
      [{ id: '001', checksum: 'c'.repeat(64) }],
    ),
    /checksum changed/,
  );
});

test('schema inspection reports missing objects and accepts the complete contract', async () => {
  const responses = [
    { rows: REQUIRED_TABLES.map((name) => ({ name })) },
    { rows: REQUIRED_INDEXES.map((name) => ({ name })) },
    { rows: REQUIRED_CONSTRAINTS.map((name) => ({ name })) },
  ];
  const report = await inspectSchema({ query: async () => responses.shift() });
  assert.doesNotThrow(() => assertSchema(report));
  assert.throws(
    () => assertSchema({ missingTables: ['users'], missingIndexes: [], missingConstraints: [] }),
    /table:users/,
  );
});
