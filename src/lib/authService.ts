/**
 * authService.ts
 * --------------
 * Replaces Supabase auth entirely.
 * Calls our own FastAPI /auth/* endpoints.
 *
 * Token strategy:
 *   access_token  — stored in memory (module variable). Lost on page refresh.
 *   refresh_token — stored in httpOnly cookie (set by backend, not accessible via JS).
 *
 * On page load, we call /auth/refresh to silently restore the session
 * using the refresh cookie if it exists.
 */

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:7700').replace(/\/$/, '');

export interface AuthUser {
  user_id: string;
  email: string;
  is_guest: boolean;
}

// In-memory access token (never stored in localStorage — safer)
let _accessToken: string | null = null;
let _currentUser: AuthUser | null = null;

// Listeners so components re-render on auth change
type AuthListener = (user: AuthUser | null) => void;
const _listeners: Set<AuthListener> = new Set();

function _notify(user: AuthUser | null) {
  _currentUser = user;
  _listeners.forEach(fn => fn(user));
}

export const authService = {

  /** Subscribe to auth state changes (like Supabase onAuthStateChange) */
  onAuthStateChange(listener: AuthListener): () => void {
    _listeners.add(listener);
    // Immediately call with current state
    listener(_currentUser);
    return () => _listeners.delete(listener);
  },

  /** Current access token for API calls */
  getAccessToken(): string | null {
    return _accessToken;
  },

  /** Current user (null if not logged in) */
  getUser(): AuthUser | null {
    return _currentUser;
  },

  /** Register with email + password */
  async register(email: string, password: string): Promise<AuthUser> {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',   // allow cookie to be set
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? 'Registration failed');
    }
    const data = await res.json();
    _accessToken = data.access_token;
    const user: AuthUser = { user_id: data.user_id, email: data.email, is_guest: data.is_guest };
    _notify(user);
    return user;
  },

  /** Sign in with email + password */
  async login(email: string, password: string): Promise<AuthUser> {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? 'Login failed');
    }
    const data = await res.json();
    _accessToken = data.access_token;
    const user: AuthUser = { user_id: data.user_id, email: data.email, is_guest: data.is_guest };
    _notify(user);
    return user;
  },

  /** Anonymous guest session */
  async loginAsGuest(): Promise<AuthUser> {
    const res = await fetch(`${API_URL}/auth/guest`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? 'Guest login failed');
    }
    const data = await res.json();
    _accessToken = data.access_token;
    const user: AuthUser = { user_id: data.user_id, email: 'Guest', is_guest: true };
    _notify(user);
    return user;
  },

  /**
   * Try to restore session from refresh cookie (called on page load).
   * Silently returns null if no cookie exists.
   */
  async restoreSession(): Promise<AuthUser | null> {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        _accessToken = null;
        _notify(null);
        return null;
      }
      const data = await res.json();
      _accessToken = data.access_token;
      const user: AuthUser = { user_id: data.user_id, email: data.email, is_guest: data.is_guest };
      _notify(user);
      return user;
    } catch {
      _accessToken = null;
      _notify(null);
      return null;
    }
  },

  /** Sign out — revokes refresh token on server */
  async logout(): Promise<void> {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      _accessToken = null;
      _notify(null);
    }
  },
};
