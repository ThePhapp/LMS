const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
});

// Convert MySQL-style ? placeholders to PostgreSQL $1, $2, ...
function toPostgres(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// Wrap a pg Pool/Client query to return [rows] matching mysql2/promise API shape.
function createQueryExecutor(queryable) {
  return {
    query: async (sql, params = []) => {
      const pgSql = toPostgres(sql);
      const result = await queryable.query(pgSql, params);
      return [result.rows];
    },
  };
}

const db = createQueryExecutor(pool);

// Run all callback queries on one real PostgreSQL client/transaction.
db.withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(createQueryExecutor(client));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // Preserve the original application/database error.
    }
    throw error;
  } finally {
    client.release();
  }
};

module.exports = db;
