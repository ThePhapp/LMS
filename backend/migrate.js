const dotenv = require('dotenv');
const { Pool } = require('pg');

const { createPoolConfig } = require('./config/postgres');
const {
  getMigrationPlan,
  loadMigrations,
  migrationPlan,
  runMigrations,
} = require('./db/migrationRunner');

async function main(argv = process.argv.slice(2)) {
  dotenv.config();
  const migrations = await loadMigrations();

  if (argv.includes('--dry-run')) {
    for (const migration of migrationPlan(migrations)) {
      console.log(`PENDING ${migration.fileName} ${migration.checksum.slice(0, 12)}`);
    }
    return;
  }

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool(createPoolConfig(process.env, { application_name: 'lms-migrations' }));
  const client = await pool.connect();
  try {
    if (argv.includes('--status')) {
      const plan = await getMigrationPlan(client, migrations);
      for (const migration of plan) console.log(`${migration.status.toUpperCase()} ${migration.fileName}`);
      return;
    }
    const plan = await runMigrations(client, { migrations });
    if (plan.every((migration) => migration.status === 'applied')) {
      console.log('Database schema is up to date');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Migration failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { main };
