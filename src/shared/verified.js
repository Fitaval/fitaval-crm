// Gym verification ("blue tick"). Set by the Super Admin, shown in the CRM.
// Mock storage: one localStorage map {gymId: true}. Replace with a `verified` flag on the gym record from the API.
import { useEffect, useState } from 'react';

const KEY = 'fitaval_verified_gyms';
const EVT = 'fitaval-verified-change';

/** The admin gym that the demo CRM account (owner@fitaval.com) belongs to. */
export const CRM_GYM_ID = 'GYM001';

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export const isVerified = (id) => {
  const m = read();
  if (id && typeof m[id] === 'boolean') return m[id];
  if (typeof m[CRM_GYM_ID] === 'boolean') return m[CRM_GYM_ID];
  return false;
};

export function setVerified(id, on, emit = true) {
  const m = read();
  const flag = Boolean(on);
  const changed = (id && m[id] !== flag) || m[CRM_GYM_ID] !== flag;
  if (id) m[id] = flag;
  m[CRM_GYM_ID] = flag;
  if (!changed) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* storage blocked: tick just won't persist */
  }
  if (emit) {
    window.dispatchEvent(new CustomEvent(EVT, { detail: { id, verified: flag } }));
  }
}

/** Live value; updates when changed here or in another tab. */
export function useVerified(id) {
  const [v, setV] = useState(() => isVerified(id));
  useEffect(() => {
    const sync = (e) => {
      if (e?.detail && typeof e.detail.verified === 'boolean') {
        if (!id || e.detail.id === id || e.detail.id === CRM_GYM_ID) {
          setV(e.detail.verified);
          return;
        }
      }
      setV(isVerified(id));
    };
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [id]);
  return v;
}
