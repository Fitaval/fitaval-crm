/**
 * Centralized, hardened environment configuration for Fitaval.
 * Ensures fail-closed defaults, strict production guards, and validated API targets.
 */

const rawMode = import.meta.env.MODE || (import.meta.env.PROD ? 'production' : 'development');
const appEnv = import.meta.env.VITE_APP_ENV;

// IS_PROD is true when running in a production environment.
export const IS_PROD = appEnv === 'production' || (import.meta.env.PROD && appEnv !== 'development' && rawMode !== 'development');
export const IS_TEST = rawMode === 'test' || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');

// Base API URL configuration
const DEFAULT_DEV_API = 'http://127.0.0.1:8000/api/v1';
const DEFAULT_PROD_API = 'https://api.fitaval.com/api/v1';
const rawApiBase = import.meta.env.VITE_API_BASE_URL;

export const API_BASE = (function resolveApiBase() {
  if (rawApiBase && typeof rawApiBase === 'string') {
    let base = rawApiBase.trim().replace(/\/+$/, '');
    // If the base URL was passed with a trailing /crm, normalize it so module prefixes (/crm, /admin, /auth) remain intact
    if (base.endsWith('/crm')) {
      base = base.slice(0, -4).replace(/\/+$/, '');
    }
    return base;
  }
  if (IS_PROD) {
    return DEFAULT_PROD_API;
  }
  return DEFAULT_DEV_API;
})();

export const IMAGE_BASE_URL = (import.meta.env.VITE_IMAGE_BASE_URL || '').replace(/\/+$/, '');

/**
 * Validates the runtime configuration.
 * Returns an object with validation results and logs critical issues.
 */
export function validateEnv() {
  const errors = [];
  const warnings = [];

  if (IS_PROD) {
    if (rawApiBase && (rawApiBase.includes('127.0.0.1') || rawApiBase.includes('localhost'))) {
      errors.push(`VITE_API_BASE_URL (${rawApiBase}) points to localhost/127.0.0.1 in a production build.`);
    } else if (!API_BASE) {
      errors.push('Production API_BASE is empty or not configured.');
    }
  }

  if (errors.length > 0) {
    console.error('[Fitaval Config Error] Configuration validation failed:', errors);
  }
  if (warnings.length > 0) {
    console.warn('[Fitaval Config Warning]:', warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    isProd: IS_PROD,
    apiBase: API_BASE,
  };
}

export function enforceEnv() {
  const result = validateEnv();
  if (IS_PROD && !result.valid) {
    throw new Error(`[CRITICAL CONFIG ERROR] Production startup aborted: ${result.errors.join('; ')}`);
  }
  return result;
}

// Auto-run validation check once on load
if (typeof window !== 'undefined') {
  validateEnv();
}
