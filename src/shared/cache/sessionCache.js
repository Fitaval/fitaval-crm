import { tokenManager } from '../auth/tokenManager';

const PREFIX = 'fitaval_qcache_v1:';

function getScopeFromSession(session) {
  if (!session) return 'anon';
  const role = (session.role || 'crm').toLowerCase();
  const userId =
    session.user?.id ||
    session.user?.email ||
    session.email ||
    session.owner_name ||
    'default';
  const safeUser = String(userId).trim().toLowerCase().replace(/[^a-z0-9_@.-]/g, '_');
  return `${role}:${safeUser}`;
}

function ls() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    /* ignore */
  }
  return null;
}

class SessionCache {
  constructor() {
    this.memory = new Map();
    this.inFlight = new Map();
    this.listeners = new Map(); // key -> Set<fn>
    this.epoch = 0;
    this.scope = getScopeFromSession(tokenManager.getSession());
    this.queryClients = new Set();

    tokenManager.onAuthChange((event, session) => {
      if (event === 'logout') {
        this.clearAll();
        return;
      }
      if (event === 'login') {
        const nextScope = getScopeFromSession(session);
        if (nextScope !== this.scope) {
          this.clearAll();
          this.scope = nextScope;
        }
      }
    });
  }

  registerQueryClient(qc) {
    if (qc) this.queryClients.add(qc);
  }

  _storageKey(key) {
    return `${PREFIX}${this.scope}:${key}`;
  }

  _ensureCurrentScope() {
    const activeScope = getScopeFromSession(tokenManager.getSession());
    if (activeScope !== this.scope) {
      this.clearAll();
      this.scope = activeScope;
    }
  }

  /**
   * Synchronous read from memory, falling back to localStorage for
   * persistence across browser reloads while logged in.
   */
  get(key) {
    this._ensureCurrentScope();
    if (this.scope === 'anon') return undefined;

    const fullKey = this._storageKey(key);
    if (this.memory.has(fullKey)) {
      return this.memory.get(fullKey);
    }

    const storage = ls();
    if (!storage) return undefined;
    try {
      const raw = storage.getItem(fullKey);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      if (parsed && 'data' in parsed) {
        this.memory.set(fullKey, parsed.data);
        return parsed.data;
      }
    } catch {
      /* ignore corrupt entry */
    }
    return undefined;
  }

  set(key, data) {
    this._ensureCurrentScope();
    if (this.scope === 'anon') return;

    const fullKey = this._storageKey(key);
    this.memory.set(fullKey, data);

    const storage = ls();
    if (storage) {
      try {
        storage.setItem(
          fullKey,
          JSON.stringify({ ts: Date.now(), data })
        );
      } catch {
        /* ignore quota errors */
      }
    }
    this._notify(key, data);
  }

  update(key, updater) {
    const current = this.get(key);
    const next = typeof updater === 'function' ? updater(current) : updater;
    this.set(key, next);
    return next;
  }

  /**
   * Deduplicates concurrent in-flight requests for the same key and prevents
   * stale writes if logout or role switch happens before the response lands.
   */
  fetchAndCache(key, fetcher) {
    this._ensureCurrentScope();
    const fullKey = this._storageKey(key);

    if (this.inFlight.has(fullKey)) {
      return this.inFlight.get(fullKey);
    }

    const startEpoch = this.epoch;
    const promise = (async () => {
      try {
        const data = await fetcher();
        if (this.epoch === startEpoch && this.scope !== 'anon') {
          this.set(key, data);
        }
        return data;
      } finally {
        this.inFlight.delete(fullKey);
      }
    })();

    this.inFlight.set(fullKey, promise);
    return promise;
  }

  invalidate(keyOrPrefix, { prefix = false } = {}) {
    this._ensureCurrentScope();
    const fullTarget = this._storageKey(keyOrPrefix);
    const storage = ls();

    if (!prefix) {
      this.memory.delete(fullTarget);
      try {
        storage?.removeItem(fullTarget);
      } catch {}
      this._notify(keyOrPrefix, undefined);
      return;
    }

    for (const k of Array.from(this.memory.keys())) {
      if (k.startsWith(fullTarget)) {
        this.memory.delete(k);
      }
    }
    if (storage) {
      try {
        for (let i = storage.length - 1; i >= 0; i--) {
          const k = storage.key(i);
          if (k && k.startsWith(fullTarget)) {
            storage.removeItem(k);
          }
        }
      } catch {}
    }

    for (const [subKey] of this.listeners.entries()) {
      if (subKey.startsWith(keyOrPrefix)) {
        this._notify(subKey, undefined);
      }
    }
  }

  clearAll() {
    this.epoch += 1;
    this.memory.clear();
    this.inFlight.clear();

    const storage = ls();
    if (storage) {
      try {
        for (let i = storage.length - 1; i >= 0; i--) {
          const k = storage.key(i);
          if (k && k.startsWith(PREFIX)) {
            storage.removeItem(k);
          }
        }
      } catch {}
    }

    this.queryClients.forEach((qc) => {
      try {
        qc.clear();
      } catch {}
    });

    for (const [key] of this.listeners.entries()) {
      this._notify(key, undefined);
    }
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    return () => {
      const set = this.listeners.get(key);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.listeners.delete(key);
      }
    };
  }

  _notify(key, data) {
    const set = this.listeners.get(key);
    if (!set) return;
    set.forEach((cb) => {
      try {
        cb(data);
      } catch {}
    });
  }
}

export const sessionCache = new SessionCache();
