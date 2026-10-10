const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { randomUUID } = require('crypto');
const { deleteStoredFile, uploadToStorage } = require('../config/storage');

const DEFAULT_JWT_ISSUER = 'lms-api';
const DEFAULT_JWT_AUDIENCE = 'lms-client';
const DEFAULT_ACCESS_TOKEN_TTL = '15m';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    issuer: process.env.JWT_ISSUER || DEFAULT_JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE || DEFAULT_JWT_AUDIENCE,
    expiresIn: process.env.JWT_ACCESS_TTL || DEFAULT_ACCESS_TOKEN_TTL,
  });
};

const validateRegistration = (body = {}) => {
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';

  if (!name || name.length > 255) {
    return { error: 'Name is required and must be at most 255 characters' };
  }

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { error: 'A valid email is required' };
  }

  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return { error: 'Password must be at least 8 characters and at most 72 bytes' };
  }

  return { name, email, password };
};

const validateLogin = (body = {}) => {
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email) || !password || Buffer.byteLength(password, 'utf8') > 1_024) {
    return { error: 'Invalid credentials' };
  }

  return { email, password };
};

exports.register = async (req, res) => {
  const registration = validateRegistration(req.body);
  if (registration.error) {
    return res.status(400).json({ message: registration.error });
  }

  const { name, email, password } = registration;
  const userRole = 'student';

  try {
    const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ message: 'Email already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?) RETURNING id',
      [name, email, hashedPassword, userRole]
    );

    res.status(201).json({
      id: result[0].id,
      name,
      email,
      role: userRole,
      avatar_url: null,
      token: generateToken(result[0].id, userRole),
    });
  } catch (error) {
    console.error('Registration failed');
    res.status(500).json({ message: 'Unable to register user' });
  }
};

exports.login = async (req, res) => {
  const credentials = validateLogin(req.body);
  if (credentials.error) {
    return res.status(400).json({ message: credentials.error });
  }

  const { email, password } = credentials;
  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(400).json({ message: 'Invalid credentials' });

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
      token: generateToken(user.id, user.role),
    });
  } catch (error) {
    console.error('Login failed');
    res.status(500).json({ message: 'Unable to sign in' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, role, avatar_url FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(users[0]);
  } catch (error) {
    console.error('Profile lookup failed');
    res.status(500).json({ message: 'Unable to load profile' });
  }
};

exports.updateProfile = async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;

  const normalizedName = typeof name === 'string' ? name.trim() : '';
  if (name !== undefined && (!normalizedName || normalizedName.length > 255)) {
    return res.status(400).json({ message: 'Name must be between 1 and 255 characters' });
  }
  if (newPassword && (typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > 72)) {
    return res.status(400).json({ message: 'New password must be at least 8 characters and at most 72 bytes' });
  }

  let uploadedAvatar = null;
  try {
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });
    const user = users[0];

    // Handle password change
    let hashedPassword = user.password;
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: 'Current password is required' });
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(newPassword, salt);
    }

    let avatar_url = user.avatar_url;
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      uploadedAvatar = await uploadToStorage(
        req.file.buffer,
        'avatars',
        `avatar-${randomUUID()}${ext}`,
        req.file.detectedMime,
      );
      avatar_url = uploadedAvatar;
    }

    await db.query(
      'UPDATE users SET name=?, password=?, avatar_url=? WHERE id=?',
      [normalizedName || user.name, hashedPassword, avatar_url, req.user.id]
    );

    if (uploadedAvatar && user.avatar_url) {
      await deleteStoredFile(user.avatar_url).catch(() => {
        console.error('Unable to clean up replaced avatar');
      });
    }

    res.json({
      id: user.id,
      name: normalizedName || user.name,
      email: user.email,
      role: user.role,
      avatar_url,
      token: req.user.token // keep same token
    });
  } catch (error) {
    if (uploadedAvatar) await deleteStoredFile(uploadedAvatar).catch(() => {});
    console.error('Profile update failed');
    res.status(500).json({ message: 'Unable to update profile' });
  }
};
