const path = require('path');
const cors = require('cors');
const express = require('express');

const { getRuntimeConfig } = require('./config/runtime');
const { setRequestTimeout, setSecurityHeaders } = require('./middleware/httpSecurity');
const { createRateLimiter } = require('./middleware/rateLimiter');

function loadDefaultRoutes() {
  return [
    ['/api/auth', require('./routes/auth')],
    ['/api/courses', require('./routes/courses')],
    ['/api/chapters', require('./routes/chapters')],
    ['/api/lessons', require('./routes/lessons')],
    ['/api/enrollments', require('./routes/enrollments')],
    ['/api/interactions', require('./routes/interactions')],
    ['/api/assignments', require('./routes/assignments')],
    ['/api/events', require('./routes/events')],
    ['/api/admin', require('./routes/admin')],
    ['/api/ai', require('./routes/ai')],
  ];
}

function corsOptions(allowedOrigins) {
  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
        return callback(null, true);
      }

      const error = new Error('Origin is not allowed by CORS policy');
      error.status = 403;
      error.code = 'CORS_ORIGIN_DENIED';
      return callback(error);
    },
  };
}

function mountStaticAssets(app, config) {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    fallthrough: true,
    setHeaders(res, filePath) {
      const mimeMap = {
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel',
      };
      const mimeType = mimeMap[path.extname(filePath).toLowerCase()];
      if (mimeType) res.setHeader('Content-Type', mimeType);
    },
  }));

  const frameAncestors = ["'self'", ...config.allowedOrigins].join(' ');
  app.use('/packages', express.static(path.join(__dirname, 'public/packages'), {
    fallthrough: true,
    setHeaders(res, filePath) {
      res.removeHeader('X-Frame-Options');
      res.setHeader('Content-Security-Policy', `frame-ancestors ${frameAncestors}`);
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      const packageMimeMap = {
        '.xml': 'application/xml',
        '.xsd': 'application/xml',
        '.dtd': 'application/xml-dtd',
        '.js': 'application/javascript',
        '.json': 'application/json',
      };
      const mimeType = packageMimeMap[path.extname(filePath).toLowerCase()];
      if (mimeType) res.setHeader('Content-Type', mimeType);
    },
  }));
}

function normalizeError(error) {
  if (error?.type === 'entity.too.large') {
    return { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' };
  }
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return { status: 400, code: 'INVALID_JSON', message: 'Request body contains invalid JSON' };
  }
  return {
    status: Number.isInteger(error?.status) && error.status >= 400 ? error.status : 500,
    code: typeof error?.code === 'string' ? error.code : 'INTERNAL_ERROR',
    message: error?.status && error.status < 500 && error.message
      ? error.message
      : 'Internal server error',
  };
}

function createApp(options = {}) {
  const env = options.env || process.env;
  const config = getRuntimeConfig(env);
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY === 'true' ? 1 : false);
  app.use(setSecurityHeaders);
  app.use(setRequestTimeout(config.requestTimeoutMs));
  app.use(cors(corsOptions(config.allowedOrigins)));
  app.use(express.json({ limit: config.bodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: config.bodyLimit }));

  app.get('/', (req, res) => res.json({ name: 'LMS API', status: 'ok' }));
  app.get(['/health', '/ping'], (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  if (options.serveStatic !== false) mountStaticAssets(app, config);

  const apiLimiter = createRateLimiter({
    ...config.apiRateLimit,
    message: 'Too many API requests; please retry later',
  });
  const authLimiter = createRateLimiter({
    ...config.authRateLimit,
    code: 'AUTH_RATE_LIMITED',
    message: 'Too many authentication attempts; please retry later',
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api', apiLimiter);

  const routes = options.routes || (options.mountDefaultRoutes === false ? [] : loadDefaultRoutes());
  for (const [routePath, router] of routes) app.use(routePath, router);
  if (typeof options.registerRoutes === 'function') options.registerRoutes(app);

  app.use((req, res) => {
    res.status(404).json({ code: 'NOT_FOUND', message: 'Route not found' });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const normalized = normalizeError(error);
    if (normalized.status >= 500 && options.logger !== false) {
      const logger = options.logger || console;
      logger.error('Unhandled request error', {
        code: normalized.code,
        method: req.method,
        path: req.originalUrl,
      });
    }
    return res.status(normalized.status).json({
      code: normalized.code,
      message: normalized.message,
    });
  });

  return app;
}

module.exports = { createApp, normalizeError };
