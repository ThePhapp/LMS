const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const MIGRATION_FILE_PATTERN = /^(\d{3,})_[a-z0-9_]+\.sql$/;
const LOCK_NAME = 'lms_schema_migrations_v1';

function checksum(sql) {
  return crypto.createHash('sha256').update(sql).digest('hex');
}

async function loadMigrations(directory = path.join(__dirname, 'migrations')) {
  const fileNames = (await fs.readdir(directory))
    .filter((fileName) => MIGRATION_FILE_PATTERN.test(fileName))
    .sort();
  if (!fileNames.length) throw new Error('No PostgreSQL migrations were found');

  const identifiers = new Set();
  const migrations = [];
  for (const fileName of fileNames) {
    const id = fileName.match(MIGRATION_FILE_PATTERN)[1];
    if (identifiers.has(id)) throw new Error(`Duplicate migration identifier: ${id}`);
    identifiers.add(id);
    const sql = await fs.readFile(path.join(directory, fileName), 'utf8');
    if (!sql.trim()) throw new Error(`Migration is empty: ${fileName}`);
    migrations.push({ id, fileName, sql, checksum: checksum(sql) });
  }
  return migrations;
}

function migrationPlan(migrations, appliedRows = []) {
  const applied = new Map(appliedRows.map((row) => [String(row.id), row.checksum]));
  for (const migration of migrations) {
    const appliedChecksum = applied.get(migration.id);
    if (appliedChecksum && appliedChecksum !== migration.checksum) {
      throw new Error(`Applied migration checksum changed: ${migration.fileName}`);
    }
  }
  return migrations.map((migration) => ({
    ...migration,
    status: applied.has(migration.id) ? 'applied' : 'pending',
  }));
}

async function runMigrations(client, { migrations, logger = console } = {}) {
  const available = migrations || await loadMigrations();
  await client.query('SELECT pg_advisory_lock(hashtext($1))', [LOCK_NAME]);
  try {
    const plan = await getMigrationPlan(client, available);

    for (const migration of plan.filter((item) => item.status === 'pending')) {
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO schema_migrations (id, file_name, checksum) VALUES ($1, $2, $3)',
          [migration.id, migration.fileName, migration.checksum],
        );
        await client.query('COMMIT');
        logger.log(`Applied migration ${migration.fileName}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    return plan;
  } finally {
    await client.query('SELECT pg_advisory_unlock(hashtext($1))', [LOCK_NAME]);
  }
}

async function getMigrationPlan(client, migrations) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(32) PRIMARY KEY,
      file_name VARCHAR(255) NOT NULL,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const installed = await client.query(
    'SELECT id, checksum FROM schema_migrations ORDER BY id',
  );
  return migrationPlan(migrations, installed.rows);
}

module.exports = {
  LOCK_NAME,
  checksum,
  getMigrationPlan,
  loadMigrations,
  migrationPlan,
  runMigrations,
};
