const DEFAULT_ALLOWED_ORIGINS = Object.freeze([
  'http://localhost:5173',
  'http://localhost:3000',
]);

function parsePositiveInteger(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

function parseAllowedOrigins(value) {
  if (!value) return [...DEFAULT_ALLOWED_ORIGINS];

  return [...new Set(
    value
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean),
  )];
}

function getRuntimeConfig(env = process.env) {
  return {
    nodeEnv: env.NODE_ENV || 'development',
    port: parsePositiveInteger(env.PORT, 5000, { max: 65535 }),
    allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS),
    bodyLimit: env.JSON_BODY_LIMIT || '1mb',
    requestTimeoutMs: parsePositiveInteger(env.REQUEST_TIMEOUT_MS, 120_000, {
      min: 1_000,
      max: 10 * 60_000,
    }),
    apiRateLimit: {
      windowMs: parsePositiveInteger(env.API_RATE_LIMIT_WINDOW_MS, 5 * 60_000, { min: 1_000 }),
      max: parsePositiveInteger(env.API_RATE_LIMIT_MAX, 300, { max: 100_000 }),
    },
    authRateLimit: {
      windowMs: parsePositiveInteger(env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60_000, { min: 1_000 }),
      max: parsePositiveInteger(env.AUTH_RATE_LIMIT_MAX, 20, { max: 10_000 }),
    },
  };
}

function validateRuntimeConfig(env = process.env) {
  if ((env.NODE_ENV || 'development') !== 'production') return;

  const missing = ['DATABASE_URL', 'JWT_SECRET', 'ALLOWED_ORIGINS']
    .filter((name) => !env[name]?.trim());

  if (missing.length) {
    throw new Error(`Missing required production configuration: ${missing.join(', ')}`);
  }

  if (env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters in production');
  }

  const origins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
  if (!origins.length || origins.some((origin) => origin === '*' || !/^https?:\/\//.test(origin))) {
    throw new Error('ALLOWED_ORIGINS must contain explicit HTTP(S) origins in production');
  }
}

module.exports = {
  DEFAULT_ALLOWED_ORIGINS,
  getRuntimeConfig,
  parseAllowedOrigins,
  validateRuntimeConfig,
};
