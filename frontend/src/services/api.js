import axios from 'axios';
import {
  AUTH_UNAUTHORIZED_EVENT,
  clearStoredUser,
  isPublicAuthEndpoint,
  readStoredUser,
} from './authSession';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: BASE_URL + '/api',
});

let unauthorizedHandled = false;

// If path is already a full URL (Supabase), return as-is; otherwise prepend backend base URL
export const assetUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${BASE_URL}${path}`;
};

api.interceptors.request.use(
  (config) => {
    const user = readStoredUser();
    if (user?.token) {
      unauthorizedHandled = false;
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';

    if (status === 401 && !isPublicAuthEndpoint(requestUrl) && !unauthorizedHandled) {
      unauthorizedHandled = true;
      clearStoredUser();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
      }
    }

    return Promise.reject(error);
  }
);

export default api;
