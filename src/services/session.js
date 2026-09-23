import { navGroups } from '../config/navigation';
import { API_BASE_URL } from './api';

export const SESSION_KEY = `delhivery:session:v1:${API_BASE_URL}`;
const pages = new Set(navGroups.flatMap(([, items]) => items.map(([id]) => id)));

export function saveSession(session) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage may be disabled; the current in-memory session can still be used.
  }
}

export function restoreSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (!saved) return null;
    if (
      typeof saved.token !== 'string' ||
      !saved.token ||
      !saved.user ||
      typeof saved.user.email !== 'string' ||
      !saved.user.email ||
      (saved.user.name != null && typeof saved.user.name !== 'string')
    )
      throw new Error('Invalid session');
    // This only checks expiry for restoring the UI; the backend verifies the JWT.
    if (saved.token.split('.').length === 3) {
      const encoded = saved.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const claims = JSON.parse(atob(encoded));
      if (claims.exp != null && (typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()))
        throw new Error('Expired session');
    }
    return {
      token: saved.token,
      user: saved.user,
      page: pages.has(saved.page) ? saved.page : 'dashboard',
    };
  } catch {
    saveSession(null);
    return null;
  }
}
