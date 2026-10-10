const dotenv = require('dotenv');
const { Pool } = require('pg');

const { createPoolConfig } = require('./config/postgres');
const { assertSchema, inspectSchema } = require('./db/schemaCheck');

async function main() {
  dotenv.config();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool(createPoolConfig(process.env, { application_name: 'lms-schema-check' }));
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    const report = await inspectSchema(client);
    assertSchema(report);
    console.log('Database connectivity and schema checks passed');
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Database check failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { main };
