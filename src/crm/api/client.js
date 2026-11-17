/**
 * ==============================================================================
 * Fitaval CRM — Live Django REST API Client
 * ==============================================================================
 * Connects directly to the Django REST Framework backend at /api/v1/crm/...
 * All mock data, seeding, and local storage state have been removed.
 * All operations execute real authenticated HTTP requests with Bearer JWT tokens.
 * ==============================================================================
 */

import { clearSession, getSession, startSession } from '../../portal/session';
import { API_BASE } from '../../config/env';
import { httpClient } from '../../shared/api/httpClient';
import { tokenManager } from '../../shared/auth/tokenManager';

export { API_BASE };
export const USE_MOCK = false;

// Helper for authenticated HTTP requests to Django REST Framework backend
async function apiRequest(endpoint, options = {}) {
  return httpClient(endpoint, options);
}

// Live DRF Entity Store communicating directly with /api/v1/crm/<endpoint>/
function createEntityStore(endpoint) {
  return {
    listSync() {
      // Synchronous initial fallback returns empty array while async network fetch is in progress
      return [];
    },

    getSync() {
      return null;
    },

    async list(sortField, limit = 100) {
      const params = new URLSearchParams();
      if (sortField) {
        const cleanSort = sortField.replace('created_date', 'created_at');
        params.set('ordering', cleanSort);
      }
      if (limit) params.set('page_size', String(limit));

      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await apiRequest(`/crm/${endpoint}/${queryStr}`);

      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.results)) return res.results;
      if (res && Array.isArray(res.data)) return res.data;
      if (res && typeof res === 'object') return [res];
      return [];
    },

    async get(id) {
      return await apiRequest(`/crm/${endpoint}/${id}/`);
    },

    async create(data) {
      return await apiRequest(`/crm/${endpoint}/`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id, patch) {
      return await apiRequest(`/crm/${endpoint}/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    },

    async delete(id) {
      await apiRequest(`/crm/${endpoint}/${id}/`, {
        method: 'DELETE',
      });
      return { success: true };
    },
  };
}

// CRM Client API matching exact surface expected by pages
export const client = {
  isMock: false,
  apiBase: API_BASE,

  entities: {
    Member: createEntityStore('members'),
    MembershipPlan: createEntityStore('plans'),
    Transaction: createEntityStore('transactions'),
    Trainer: createEntityStore('trainers'),
    GymProfile: createEntityStore('profile'),
    WalletTransaction: createEntityStore('wallet/transactions'),
    Attendance: createEntityStore('attendance'),
    Subscription: createEntityStore('subscription'),
    MemberCheckin: createEntityStore('checkins'),
    Notification: {
      async list() {
        return await apiRequest('/crm/notifications/');
      },
      async unreadCount() {
        return await apiRequest('/crm/notifications/unread-count/');
      },
      async markRead(id) {
        return await apiRequest(`/crm/notifications/${id}/read/`, { method: 'PUT' });
      },
      async markAllRead() {
        return await apiRequest('/crm/notifications/read-all/', { method: 'PUT' });
      },
    },
    Dashboard: {
      async get(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return await apiRequest(`/crm/dashboard/${qs ? '?' + qs : ''}`);
      },
      async update(data) {
        return await apiRequest('/crm/dashboard/', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },
      async refresh() {
        return await apiRequest('/crm/dashboard/?refresh=true');
      },
    },
  },

  auth: {
    async me() {
      const session = getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      try {
        const user = await apiRequest('/auth/me/');
        startSession({ ...session, user });
        return user;
      } catch (e) {
        if (session?.user) return session.user;
        throw e;
      }
    },

    setToken(token) {
      tokenManager.setAccessToken(token);
    },

    getAuthToken() {
      return tokenManager.getAccessToken();
    },

    logout(redirectUrl) {
      apiRequest('/auth/logout/', { method: 'POST' }).catch(() => {});
      clearSession();
      if (redirectUrl && typeof window !== 'undefined') {
        window.location.href = redirectUrl;
      }
    },

    redirectToLogin(returnUrl) {
      const target = returnUrl ? `/login?returnTo=${encodeURIComponent(returnUrl)}` : '/login';
      if (typeof window !== 'undefined') {
        window.location.href = target;
      }
    },

    isAuthenticated() {
      return Boolean(tokenManager.getAccessToken() || getSession()?.token);
    },
  },

  app: {
    async getPublicSettings() {
      return await apiRequest('/crm/settings/public/');
    },
  },

  integrations: {
    Core: {
      async UploadPublicFile({ file }) {
        if (!file) throw new Error('No file provided');

        const formData = new FormData();
        formData.append('file', file);
        const data = await httpClient.post('/crm/upload/', formData);
        return { file_url: data?.file_url || data?.url };
      },
    },
  },
};

export default client;
