import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AUTH_STORAGE_KEY,
  isPublicAuthEndpoint,
  mergeProfileWithToken,
  parseStoredUser,
  readStoredUser,
} from '../src/services/authSession.js';
import {
  ADMIN_ROLES,
  getRoleHomePath,
  hasAllowedRole,
  INSTRUCTOR_ROLES,
} from '../src/routing/access.js';

const createStorage = (initialValue) => {
  const values = new Map();
  if (initialValue !== undefined) values.set(AUTH_STORAGE_KEY, initialValue);

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key),
  };
};

test('malformed and invalid stored sessions are rejected without throwing', () => {
  assert.equal(parseStoredUser('{bad json'), null);
  assert.equal(parseStoredUser(JSON.stringify({ role: 'admin' })), null);

  const storage = createStorage('{bad json');
  assert.equal(readStoredUser(storage), null);
  assert.equal(storage.has(AUTH_STORAGE_KEY), false);

  const blockedStorage = {
    getItem: () => { throw new Error('Storage blocked'); },
    removeItem: () => { throw new Error('Storage blocked'); },
  };
  assert.equal(readStoredUser(blockedStorage), null);
});

test('profile refresh replaces stale identity fields and preserves only the token', () => {
  const refreshed = mergeProfileWithToken({
    id: 7,
    name: 'Current Name',
    email: 'current@example.test',
    role: 'student',
    avatar_url: '/current.png',
  }, 'signed-token');

  assert.deepEqual(refreshed, {
    id: 7,
    name: 'Current Name',
    email: 'current@example.test',
    role: 'student',
    avatar_url: '/current.png',
    token: 'signed-token',
  });
});

test('public authentication endpoints are excluded from session-expiry handling', () => {
  assert.equal(isPublicAuthEndpoint('/auth/login'), true);
  assert.equal(isPublicAuthEndpoint('/api/auth/register?source=web'), true);
  assert.equal(isPublicAuthEndpoint('/auth/me'), false);
});

test('role helpers enforce student, instructor, and admin route boundaries', () => {
  assert.equal(hasAllowedRole({ role: 'student' }), true);
  assert.equal(hasAllowedRole({ role: 'student' }, INSTRUCTOR_ROLES), false);
  assert.equal(hasAllowedRole({ role: 'lecturer' }, INSTRUCTOR_ROLES), true);
  assert.equal(hasAllowedRole({ role: 'admin' }, INSTRUCTOR_ROLES), true);
  assert.equal(hasAllowedRole({ role: 'lecturer' }, ADMIN_ROLES), false);
  assert.equal(hasAllowedRole({ role: 'admin' }, ADMIN_ROLES), true);
  assert.equal(hasAllowedRole({ role: 'unknown' }), false);

  assert.equal(getRoleHomePath('student'), '/dashboard');
  assert.equal(getRoleHomePath('lecturer'), '/instructor/dashboard');
  assert.equal(getRoleHomePath('admin'), '/admin');
  assert.equal(getRoleHomePath('unknown'), '/');
});
