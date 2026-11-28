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
  const owner_name = user.owner_name || user.name || '';
  const gym_name = user.gym_name || user.gymName || '';
  startSession(
    {
      role: 'crm',
      email: user.email,
      name: owner_name,
      owner_name,
      gym_name,
      token: token || tokenManager.getAccessToken(),
      user: {
        ...user,
        name: owner_name,
        owner_name,
        gym_name,
      },
    },
    meta
  );
}

/**
 * Authenticates user strictly against backend API (/api/v1/auth/login/).
 * Returns Promise<{ ok: true, role } | { ok: false, error }>.
 */
export async function login(email, password, { realm = '' } = {}) {
  const e = (email || '').trim().toLowerCase();
  if (!e || !password) return { ok: false, error: 'Enter your email and password.' };

  const cleanRealm = (realm || '').trim().toLowerCase();
  const endpoint =
    cleanRealm === 'admin'
      ? '/auth/admin/login/'
      : cleanRealm === 'crm'
        ? '/auth/portal/login/'
        : '/auth/login/';

  try {
    const data = await httpClient.post(
      endpoint,
      { email: e, password, ...(cleanRealm ? { realm: cleanRealm } : {}) },
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
      portalSelectionRequired: err.status === 409 && err.data?.code === 'portal_selection_required',
      availablePortals: err.data?.available_portals || [],
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
  if ((password || '').length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };

  const gym_name = (meta.gym_name || meta.gymName || '').trim() || 'Fitaval Club';
  const owner_name = (meta.owner_name || meta.ownerName || '').trim() || e.split('@')[0];
  const phone = (meta.phone || '').trim();

  try {
    await httpClient.post(
      '/auth/portal/register/',
      {
        email: e,
        password,
        gym_name,
        owner_name,
        phone,
        role: 'crm',
      },
      { skipAuth: true, retryOn401: false }
    );
    ss()?.setItem(PENDING_KEY, JSON.stringify({ email: e, password, owner_name, gym_name, phone }));
    return { ok: true, email: e };
  } catch (err) {
    return { ok: false, error: err.message || 'Unable to connect to registration server.' };
  }
}

/** Verifies sign-up OTP and registers user credentials. */
export async function resendSignUpOtp(email) {
  try {
    await httpClient.post(
      '/auth/portal/resend-otp/',
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

  const gym_name = pending.gym_name || pending.gymName || 'Fitaval Club';
  const owner_name = pending.owner_name || pending.name || '';

  try {
    const data = await httpClient.post(
      '/auth/portal/verify-otp/',
      {
        email: pending.email,
        otp: code,
        role: 'crm',
        gym_name,
        owner_name,
        phone: pending.phone || '',
        password: pending.password,
      },
      { skipAuth: true, retryOn401: false }
    );
    const token = data.access_token || data.access || data.token;
    const refreshToken = data.refresh_token || data.refresh;
    const rawUser = data.user || {};
    const resolvedOwnerName = rawUser.owner_name || rawUser.name || owner_name;
    const resolvedGymName = rawUser.gym_name || gym_name;
    const user = {
      ...rawUser,
      name: resolvedOwnerName,
      owner_name: resolvedOwnerName,
      gym_name: resolvedGymName,
      email: rawUser.email || pending.email,
    };
    ss()?.removeItem(PENDING_KEY);
    startCrmSession(user, token, { refreshToken });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'Verification failed. Please try again.' };
  }
}

export const homePath = (role) => (role === 'admin' ? '/admin' : '/');
