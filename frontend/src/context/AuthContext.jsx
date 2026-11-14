import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [academy, setAcademy] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setAcademy(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setAcademy(data.academy);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
      setAcademy(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async ({ email, password, academySlug, role }) => {
    const payload = {
      email: String(email || '').trim(),
      password: String(password || ''),
      academySlug: academySlug ? String(academySlug).trim() : undefined,
      role,
    };
    const { data } = await api.post('/auth/login', payload);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setAcademy(data.academy);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setAcademy(null);
  };

  return (
    <AuthContext.Provider value={{ user, academy, loading, login, logout, refresh, setAcademy }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
