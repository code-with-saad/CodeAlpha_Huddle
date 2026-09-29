import axios from 'axios';

const TOKEN_KEY = 'huddle_token';

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable; the session lasts until reload */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Registered by the auth provider so the API layer does not import React state.
export function onUnauthorized(handler) {
  const id = api.interceptors.response.use(
    (res) => res,
    (err) => {
      const url = err.config?.url || '';
      const credentialCall = url.startsWith('/auth/login') || url.startsWith('/auth/register');
      if (err.response?.status === 401 && !credentialCall) handler();
      return Promise.reject(err);
    }
  );
  return () => api.interceptors.response.eject(id);
}

export function errorMessage(err) {
  const status = err.response?.status;
  // No response, or a gateway failure: the API itself is unreachable.
  if (!err.response || status === 502 || status === 503 || status === 504) {
    return 'Cannot reach the server. Check your connection and try again.';
  }
  return err.response.data?.message || 'Something went wrong. Try again.';
}

export const fieldErrors = (err) => err.response?.data?.errors || {};
