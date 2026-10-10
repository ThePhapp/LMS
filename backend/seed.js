const dotenv = require('dotenv');
const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');

const { createPoolConfig } = require('./config/postgres');

async function main() {
  dotenv.config();
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo seed is disabled in production');
  }
  if (process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Set ALLOW_DEMO_SEED=true to acknowledge destructive demo seeding');
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

  const sql = await fs.readFile(path.join(__dirname, 'seed.sql'), 'utf8');
  const pool = new Pool(createPoolConfig(process.env, { application_name: 'lms-demo-seed' }));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Demo seed completed atomically');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Demo seed failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { main };
