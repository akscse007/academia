import axios from 'axios';

// In production (Vercel), set VITE_API_URL to your backend origin,
// e.g. https://academia-ufst.onrender.com
// In dev we leave it blank — Vite proxies /api and /uploads to :5000.
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

export const API_ORIGIN = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    if (status === 401) {
      const p = location.pathname || '/';
      const isPublicRoute =
        p === '/' ||
        p.startsWith('/login') ||
        p.startsWith('/a/') ||
        p.startsWith('/register-academy') ||
        p.startsWith('/about-developer');
      // On a public page, let the UI handle the error (toast etc.) — do NOT wipe
      // the token or navigate; that caused the "always re-login" loop.
      if (!isPublicRoute) {
        localStorage.removeItem('token');
        location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
