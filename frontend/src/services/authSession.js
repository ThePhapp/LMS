export const AUTH_STORAGE_KEY = 'user';
export const AUTH_UNAUTHORIZED_EVENT = 'lms:auth-unauthorized';

const getDefaultStorage = () => (
  typeof localStorage === 'undefined' ? null : localStorage
);

const isObject = (value) => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
);

export const normalizeSessionUser = (value) => {
  if (!isObject(value) || typeof value.token !== 'string' || !value.token.trim()) {
    return null;
  }

  return {
    id: value.id,
    name: typeof value.name === 'string' ? value.name : '',
    email: typeof value.email === 'string' ? value.email : '',
    role: typeof value.role === 'string' ? value.role : '',
    avatar_url: value.avatar_url ?? null,
    token: value.token,
  };
};

export const parseStoredUser = (rawValue) => {
  if (typeof rawValue !== 'string' || !rawValue) return null;

  try {
    return normalizeSessionUser(JSON.parse(rawValue));
  } catch {
    return null;
  }
};

export const readStoredUser = (storage = getDefaultStorage()) => {
  if (!storage) return null;

  try {
    const rawValue = storage.getItem(AUTH_STORAGE_KEY);
    const user = parseStoredUser(rawValue);

    if (rawValue && !user) storage.removeItem(AUTH_STORAGE_KEY);
    return user;
  } catch {
    return null;
  }
};

export const writeStoredUser = (user, storage = getDefaultStorage()) => {
  const normalized = normalizeSessionUser(user);
  if (!storage || !normalized) return null;

  try {
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return null;
  }
};

export const clearStoredUser = (storage = getDefaultStorage()) => {
  if (!storage) return;

  try {
    storage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
};

export const mergeProfileWithToken = (profile, token) => (
  normalizeSessionUser({ ...profile, token })
);

export const isPublicAuthEndpoint = (requestUrl = '') => {
  try {
    const pathname = new URL(requestUrl, 'http://localhost').pathname
      .replace(/^\/api(?=\/|$)/, '');
    return pathname === '/auth/login' || pathname === '/auth/register';
  } catch {
    return false;
  }
};
