/**
 * Axios instance + typed-ish API helpers. The token is injected from
 * localStorage on every request; a 401 clears it and bounces to /login.
 */
import axios from 'axios';

const TOKEN_KEY = 'pm_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// In dev, VITE_API_URL is unset and the Vite proxy serves "/api" on the same
// origin. In production (client and server on different domains) set
// VITE_API_URL to the deployed backend, e.g. https://your-api.onrender.com/api
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && tokenStore.get()) {
      tokenStore.clear();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/** Unwrap the { success, data, error } envelope into either data or a thrown message. */
function unwrap(promise) {
  return promise.then(
    (res) => res.data.data,
    (err) => {
      const msg = err.response?.data?.error?.message || err.message || 'Something went wrong';
      throw new Error(msg);
    }
  );
}

export const authApi = {
  register: (body) => unwrap(api.post('/auth/register', body)),
  login: (body) => unwrap(api.post('/auth/login', body)),
  me: () => unwrap(api.get('/auth/me')),
};

export const projectApi = {
  generate: (profile) => unwrap(api.post('/projects/generate', profile)),
  listSaved: () => unwrap(api.get('/projects/saved')),
  save: (idea) => unwrap(api.post(`/projects/save/new`, idea)),
  remove: (id) => unwrap(api.delete(`/projects/saved/${id}`)),
  details: (id) => unwrap(api.get(`/projects/details/${id}`)),
  improve: (id, currentProgress) => unwrap(api.post(`/projects/improve/${id}`, { currentProgress })),
  updateStatus: (id, status) => unwrap(api.put(`/projects/status/${id}`, { status })),
};

export const mentorApi = {
  chat: (body) => unwrap(api.post('/mentor/chat', body)),
  conversations: () => unwrap(api.get('/mentor/conversations')),
  conversation: (id) => unwrap(api.get(`/mentor/conversation/${id}`)),
  deleteConversation: (id) => unwrap(api.delete(`/mentor/conversation/${id}`)),
};

export const generateApi = {
  abstract: (body) => unwrap(api.post('/generate/abstract', body)),
};

export const exploreApi = {
  trending: () => unwrap(api.get('/explore/trending')),
};

export const statusApi = {
  health: () => unwrap(api.get('/health')),
  status: () => unwrap(api.get('/status')),
};

export default api;
