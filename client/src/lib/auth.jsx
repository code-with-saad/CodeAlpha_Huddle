import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, onUnauthorized, tokenStore } from './api';
import { toast } from './toast.js';

const AuthContext = createContext(null);

// status: 'loading' while the saved token is checked, then 'in' or 'out'.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(tokenStore.get() ? 'loading' : 'out');

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus('out');
  }, []);

  const startSession = useCallback((data) => {
    tokenStore.set(data.token);
    setUser(data.user);
    setStatus('in');
    return data.user;
  }, []);

  // A rejected token while signed in means the session ended (another device changed the password, or it expired).
  useEffect(
    () =>
      onUnauthorized(() => {
        if (tokenStore.get()) toast.warning('Your session ended. Please log in again.');
        logout();
      }),
    [logout]
  );

  useEffect(() => {
    if (!tokenStore.get()) return;
    let cancelled = false;
    api
      .get('/auth/me')
      .then(({ data }) => {
        if (cancelled) return;
        setUser(data.user);
        setStatus('in');
      })
      .catch((err) => {
        // Only a rejected token ends the session; a network failure should not log anyone out.
        if (cancelled || err.response?.status === 401) return;
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      login: async (body) => startSession((await api.post('/auth/login', body)).data),
      register: async (body) => startSession((await api.post('/auth/register', body)).data),
      changePassword: async (body) => startSession((await api.post('/auth/password', body)).data),
      updateProfile: async (body) => setUser((await api.patch('/auth/me', body)).data.user),
      logout,
    }),
    [user, status, logout, startSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
