const { Pool } = require('pg');
const { createPoolConfig } = require('./postgres');

const pool = new Pool(createPoolConfig());

// Convert the legacy query facade's ? placeholders to PostgreSQL $1, $2, ...
function toPostgres(sql) {
  let parameter = 0;
  let output = '';
  let quote = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1];

    if (lineComment) {
      output += character;
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      output += character;
      if (character === '*' && next === '/') {
        output += next;
        index += 1;
        blockComment = false;
      }
      continue;
    }
    if (quote) {
      output += character;
      if (character === quote) {
        if (next === quote) {
          output += next;
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (character === '-' && next === '-') {
      output += character + next;
      index += 1;
      lineComment = true;
      continue;
    }
    if (character === '/' && next === '*') {
      output += character + next;
      index += 1;
      blockComment = true;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      output += character;
      continue;
    }
    output += character === '?' ? `$${++parameter}` : character;
  }
  return output;
}

// Preserve the controllers' historical tuple return shape while using pg underneath.
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

db.close = () => pool.end();
db.toPostgres = toPostgres;

module.exports = db;
