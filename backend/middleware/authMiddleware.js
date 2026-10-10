const jwt = require('jsonwebtoken');
const db = require('../config/db');

const DEFAULT_JWT_ISSUER = 'lms-api';
const DEFAULT_JWT_AUDIENCE = 'lms-client';

exports.protect = async (req, res, next) => {
  const authorization = req.headers?.authorization;
  const [scheme, token, extra] = typeof authorization === 'string'
    ? authorization.trim().split(/\s+/)
    : [];

  if (scheme?.toLowerCase() !== 'bearer' || !token || extra) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: process.env.JWT_ISSUER || DEFAULT_JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE || DEFAULT_JWT_AUDIENCE,
    });
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }

  if (!decoded || typeof decoded !== 'object' || !Number.isInteger(decoded.id) || decoded.id <= 0) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }

  let users;
  try {
    [users] = await db.query('SELECT id, role FROM users WHERE id = ?', [decoded.id]);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to authenticate user' });
  }

  if (!users.length) {
    return res.status(401).json({ message: 'Not authorized, user not found' });
  }

  const currentUser = users[0];
  req.user = {
    id: currentUser.id,
    role: currentUser.role,
    token, // updateProfile includes the existing token in its response.
  };
  return next();
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `User role ${req.user.role} is not authorized to access this route` });
    }
    next();
  };
};
