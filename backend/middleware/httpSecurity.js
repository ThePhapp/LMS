function setSecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  next();
}

function setRequestTimeout(timeoutMs) {
  return (req, res, next) => {
    req.setTimeout(timeoutMs);
    res.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        res.status(503).json({
          code: 'REQUEST_TIMEOUT',
          message: 'Request timed out',
        });
      }
    });
    next();
  };
}

module.exports = { setRequestTimeout, setSecurityHeaders };
