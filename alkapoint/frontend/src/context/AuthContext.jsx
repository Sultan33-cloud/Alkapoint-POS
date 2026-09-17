import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('alkapoint_user');
    if (!cached) return null;
    try { return JSON.parse(cached); } catch { return null; }
  });
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('alkapoint_token')));

  useEffect(() => {
    const token = localStorage.getItem('alkapoint_token');
    if (!token) return undefined;
    api.get('/auth/me')
      .then((res) => {
        setUser(res.data);
        localStorage.setItem('alkapoint_user', JSON.stringify(res.data));
      })
      .catch(() => {
        localStorage.removeItem('alkapoint_token');
        localStorage.removeItem('alkapoint_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
    return undefined;
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('alkapoint_token', res.data.token);
    localStorage.setItem('alkapoint_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('alkapoint_token');
    localStorage.removeItem('alkapoint_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// This hook is intentionally co-located with its provider so consumers share its private context.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
