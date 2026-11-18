/**
 * ==============================================================================
 * Fitaval Unified Session & Authentication Service
 * ==============================================================================
 * Role decides which portal opens:
 *   - role "crm"   -> Gym Owner CRM (src/crm)
 *   - role "admin" -> Super Admin Panel (src/admin)
 *
 * Mock login is completely removed. All authentication is strictly verified
 * against the Django REST Framework backend API.
 * ==============================================================================
 */

import { API_BASE } from '../config/env';
import { tokenManager } from '../shared/auth/tokenManager';
import { httpClient } from '../shared/api/httpClient';

export { API_BASE };

const PENDING_KEY = 'fitaval_pending_signup';
const ss = () => (typeof window !== 'undefined' ? window.sessionStorage : null);

export function getSession() {
  return tokenManager.getSession();
}

export function startSession(session, meta = {}) {
  tokenManager.setSession(session, meta);
}

/** Signs a gym owner into the CRM */
export function startCrmSession(user, token, meta = {}) {
  startSession(
    {
      role: 'crm',
      email: user.email,
      name: user.name,
      token: token || tokenManager.getAccessToken(),
      user,
    },
    meta
  );
}

/**
 * Authenticates user strictly against backend API (/api/v1/auth/login/).
 * Returns Promise<{ ok: true, role } | { ok: false, error }>.
 */
export async function login(email, password) {
  const e = (email || '').trim().toLowerCase();
  if (!e || !password) return { ok: false, error: 'Enter your email and password.' };

  try {
    const data = await httpClient.post(
      '/auth/login/',
      { email: e, password },
      { skipAuth: true, retryOn401: false }
    );

    const token = data.access_token || data.access || data.token || data.key;
    const refreshToken = data.refresh_token || data.refresh;
    const user = data.user || { email: e, name: e.split('@')[0] };
    const rawRole = (user.role || data.role || '').toLowerCase();
    const role = rawRole.includes('admin') ? 'admin' : 'crm';

    if (!token) {
      return { ok: false, error: 'Authentication succeeded but no authorization token was received.' };
    }

    if (role === 'admin') {
      startSession(
        { role: 'admin', email: user.email || e, name: user.name, token, user },
        { refreshToken }
      );
      return { ok: true, role: 'admin' };
    }

    startCrmSession(
      { id: user.id, name: user.name || e.split('@')[0], email: user.email || e, ...user },
      token,
      { refreshToken }
    );
    return { ok: true, role: 'crm' };
  } catch (err) {
    return {
      ok: false,
      error:
        err.status === 401
          ? 'Invalid email or password.'
          : err.message || 'Unable to connect to authentication server. Please check your backend.',
      needsVerification: Boolean(err.data?.needs_verification),
      email: err.data?.email || e,
    };
  }
}

/** Ends the session without navigating */
export function clearSession() {
  tokenManager.clearSession();
}

export async function logout() {
  try {
    await httpClient.post('/auth/logout/', {}, { skipAuth: false, retryOn401: false }).catch(() => {});
  } catch {
    /* ignore */
  }
  clearSession();
  if (typeof window !== 'undefined') {
    window.location.assign('/login');
  }
}

/* ---- sign-up (strictly for CRM gym owners) ---- */
export async function signUp(email, password, meta = {}) {
  const e = (email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(e)) return { ok: false, error: 'Enter a valid email address.' };
  if ((password || '').length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };

  try {
    await httpClient.post(
      '/auth/portal/register/',
      {
        email: e,
        password,
        gym_name: meta.gymName || 'Fitaval Club',
        full_name: meta.ownerName || e.split('@')[0],
        phone: meta.phone || '',
        role: 'crm',
      },
      { skipAuth: true, retryOn401: false }
    );
    ss()?.setItem(PENDING_KEY, JSON.stringify({ email: e, password, name: meta.ownerName, gymName: meta.gymName, phone: meta.phone || '' }));
    return { ok: true, email: e };
  } catch (err) {
    return { ok: false, error: err.message || 'Unable to connect to registration server.' };
  }
}

/** Verifies sign-up OTP and registers user credentials. */
export async function resendSignUpOtp(email) {
  try {
    await httpClient.post(
      '/auth/send-otp/',
      { email },
      { skipAuth: true, retryOn401: false }
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'Could not resend verification code.' };
  }
}

export async function verifySignUp(code) {
  if (!/^\d{4,8}$/.test(code || '')) return { ok: false, error: 'Enter the verification code.' };
  let pending = {};
  try {
    pending = JSON.parse(ss()?.getItem(PENDING_KEY) || '{}');
  } catch {
    /* ignore */
  }
  if (!pending.email) return { ok: false, error: 'Your sign-up expired. Please start again.' };

  try {
    const data = await httpClient.post(
      '/auth/portal/verify-otp/',
      { email: pending.email, otp: code, role: 'crm' },
      { skipAuth: true, retryOn401: false }
    );
    const token = data.access_token || data.access || data.token;
    const refreshToken = data.refresh_token || data.refresh;
    const user = data.user || { name: pending.name, email: pending.email, gymName: pending.gymName };
    ss()?.removeItem(PENDING_KEY);
    startCrmSession(user, token, { refreshToken });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'Verification failed. Please try again.' };
  }
}

export const homePath = (role) => (role === 'admin' ? '/admin' : '/');
