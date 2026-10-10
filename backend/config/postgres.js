function positiveInteger(value, fallback, { min = 1, max = 1_000 } = {}) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function databaseHost(connectionString) {
  try {
    return new URL(connectionString).hostname.toLowerCase();
  } catch (_) {
    return '';
  }
}

function isLocalDatabase(connectionString) {
  const host = databaseHost(connectionString);
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function getSslConfig(env = process.env) {
  const mode = env.DATABASE_SSL || (isLocalDatabase(env.DATABASE_URL) ? 'disable' : 'verify-full');
  if (mode === 'disable') {
    if (env.NODE_ENV === 'production' && !isLocalDatabase(env.DATABASE_URL)) {
      throw new Error('DATABASE_SSL=disable is not allowed for a remote production database');
    }
    return false;
  }
  if (mode === 'verify-full') {
    return {
      rejectUnauthorized: true,
      ...(env.DATABASE_SSL_CA ? { ca: env.DATABASE_SSL_CA.replace(/\\n/g, '\n') } : {}),
    };
  }
  if (mode === 'require' && env.DATABASE_SSL_ALLOW_INSECURE === 'true') {
    return { rejectUnauthorized: false };
  }
  throw new Error('DATABASE_SSL must be disable or verify-full; insecure require mode needs DATABASE_SSL_ALLOW_INSECURE=true');
}

function createPoolConfig(env = process.env, overrides = {}) {
  return {
    ...(env.DATABASE_URL ? { connectionString: env.DATABASE_URL } : {}),
    ssl: getSslConfig(env),
    max: positiveInteger(env.DATABASE_POOL_MAX, 10, { max: 100 }),
    idleTimeoutMillis: positiveInteger(env.DATABASE_IDLE_TIMEOUT_MS, 30_000, { min: 1_000, max: 600_000 }),
    connectionTimeoutMillis: positiveInteger(env.DATABASE_CONNECT_TIMEOUT_MS, 10_000, { min: 1_000, max: 120_000 }),
    application_name: env.DATABASE_APP_NAME || 'lms-api',
    ...overrides,
  };
}

module.exports = { createPoolConfig, getSslConfig, isLocalDatabase };
