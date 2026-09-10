import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../api/services.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const res = await authService.getMe();
      setUser(res.data.data || res.data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (credentials) => {
    const res = await authService.login(credentials);
    const userData = res.data.data || res.data;
    setUser(userData);
    await loadUser();
    return userData;
  }, [loadUser]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (err) {
      // ignore
    }
    setUser(null);
    window.location.href = '/login';
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    loadUser,
    setUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
