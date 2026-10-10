import React, { createContext, useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import {
  AUTH_UNAUTHORIZED_EVENT,
  clearStoredUser,
  mergeProfileWithToken,
  normalizeSessionUser,
  readStoredUser,
  writeStoredUser,
} from '../services/authSession';

// Kept here for backwards-compatible imports across existing pages.
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(() => readStoredUser());
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((value) => {
    setUserState((currentUser) => {
      const nextValue = typeof value === 'function' ? value(currentUser) : value;
      if (!nextValue) {
        clearStoredUser();
        return null;
      }

      const normalized = normalizeSessionUser(nextValue);
      if (!normalized) return currentUser;

      writeStoredUser(normalized);
      return normalized;
    });
  }, []);

  const logout = useCallback(() => {
    clearStoredUser();
    setUserState(null);
  }, []);

  useEffect(() => {
    let active = true;

    const handleUnauthorized = () => {
      if (active) setUserState(null);
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

    const refreshSession = async () => {
      const storedUser = readStoredUser();
      if (!storedUser) {
        if (active) {
          setUserState(null);
          setLoading(false);
        }
        return;
      }

      if (active) setUserState(storedUser);

      try {
        const { data: profile } = await api.get('/auth/me');
        const refreshedUser = mergeProfileWithToken(profile, storedUser.token);

        if (!refreshedUser) {
          clearStoredUser();
          if (active) setUserState(null);
          return;
        }

        writeStoredUser(refreshedUser);
        if (active) setUserState(refreshedUser);
      } catch (error) {
        const status = error.response?.status;
        if (status === 401 || status === 403 || status === 404) {
          clearStoredUser();
          if (active) setUserState(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    refreshSession();

    return () => {
      active = false;
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const authenticatedUser = normalizeSessionUser(res.data);
    if (!authenticatedUser) throw new Error('Invalid login response');
    setUser(authenticatedUser);
    return authenticatedUser;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    const authenticatedUser = normalizeSessionUser(res.data);
    if (!authenticatedUser) throw new Error('Invalid registration response');
    setUser(authenticatedUser);
    return authenticatedUser;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
