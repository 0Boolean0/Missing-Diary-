import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

/**
 * Decode a JWT payload without verifying the signature.
 * Returns the parsed payload object, or null if the token is malformed.
 */
function decodeJwtPayload(token) {
  try {
    const base64Payload = token.split('.')[1];
    if (!base64Payload) return null;
    // atob requires standard base64; JWT uses base64url — replace URL-safe chars
    const base64 = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/**
 * Returns true if the JWT stored in localStorage is expired or invalid.
 */
function isTokenExpired(token) {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  // exp is in seconds; Date.now() is in milliseconds
  return payload.exp < Date.now() / 1000;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));

  // On mount, validate the stored JWT. If it is expired or missing, clear the
  // session and redirect to /login so the user is not stuck in a broken state.
  // AuthProvider sits outside BrowserRouter, so useNavigate is unavailable here;
  // window.location.href is used for the redirect instead.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (isTokenExpired(token)) {
      // Only redirect if there was actually a stale session to clear
      const hadSession = token !== null || localStorage.getItem('user') !== null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      if (hadSession && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }, []);

  // Fix #18: wrap functions in useCallback so useMemo dependency array is correct
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, register, logout }), [user, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
