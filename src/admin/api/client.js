/**
 * ==============================================================================
 * Fitaval Super Admin — Live Django REST API Client
 * ==============================================================================
 * Connects directly to the Django REST Framework backend at /api/v1/admin/...
 * All mock data stores and simulated mutations have been removed.
 * All operations execute real authenticated HTTP requests with Bearer JWT tokens.
 * ==============================================================================
 */

import { API_BASE } from '../../config/env';
import { httpClient } from '../../shared/api/httpClient';

export { API_BASE };

// Helper to execute authenticated requests to backend
async function apiRequest(endpoint, options = {}) {
  return httpClient(endpoint, options);
}

export const adminClient = {
  // 1. Gym Management
  gyms: {
    async list(params = {}) {
      const q = new URLSearchParams(params).toString();
      return apiRequest('/admin/gyms' + (q ? `?${q}` : ''));
    },

    async get(id) {
      return apiRequest(`/admin/gyms/${id}`);
    },

    async update(id, patch) {
      return apiRequest(`/admin/gyms/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    },

    async verify(id, verified) {
      return apiRequest(`/admin/gyms/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ verified }),
      });
    },

    async getPhotos(id) {
      return apiRequest(`/admin/gyms/${id}/photos`);
    },
  },

  // 2. Gym Onboarding & Approvals
  approvals: {
    async list(params = {}) {
      const q = new URLSearchParams(params).toString();
      return apiRequest('/admin/approvals' + (q ? `?${q}` : ''));
    },

    async review(id, note) {
      return apiRequest(`/admin/approvals/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ note, internal_note: note }),
      });
    },

    async approve(id, data = {}) {
      return apiRequest(`/admin/approvals/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async reject(id, reason = '', note = '') {
      return apiRequest(`/admin/approvals/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason, note, internal_note: note }),
      });
    },

    async saveDocuments(id, documents) {
      return apiRequest(`/admin/approvals/${id}/documents/`, {
        method: 'POST',
        body: JSON.stringify({ documents }),
      });
    },
  },

  upload: {
    async file(file) {
      if (!file) throw new Error('No file provided');
      const formData = new FormData();
      formData.append('file', file);
      return apiRequest('/admin/upload/', {
        method: 'POST',
        body: formData,
      });
    },
  },

  // 3. Cross-Gym Users (Members)
  users: {
    async list(params = {}) {
      const q = new URLSearchParams(params).toString();
      return apiRequest('/admin/users' + (q ? `?${q}` : ''));
    },

    async get(id) {
      return apiRequest(`/admin/users/${id}`);
    },

    async rotateQr(id) {
      return apiRequest(`/admin/users/${id}/rotate-qr`, { method: 'POST' });
    },

    async export(params = {}) {
      return apiRequest('/admin/users/export', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
  },

  // 4. Staff & Trainers per Gym
  staff: {
    async list(gymId) {
      return apiRequest(`/admin/gyms/${gymId}/staff`);
    },

    async create(gymId, data) {
      return apiRequest(`/admin/gyms/${gymId}/staff`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(gymId, id, patch) {
      return apiRequest(`/admin/gyms/${gymId}/staff/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    },

    async setRole(staffId, roleId) {
      return apiRequest(`/admin/staff/${staffId}/role`, {
        method: 'POST',
        body: JSON.stringify({ role_id: roleId }),
      });
    },
  },

  trainers: {
    async list(gymId) {
      return apiRequest(`/admin/gyms/${gymId}/trainers`);
    },
  },

  // 5. Finance & Revenue
  finance: {
    async getOverview(params = {}) {
      const q = new URLSearchParams(params).toString();
      return apiRequest('/admin/finance/overview' + (q ? `?${q}` : ''));
    },

    async getSummary(period = 'month') {
      return apiRequest(`/admin/finance/summary?period=${period}`);
    },
  },

  // 6. Gym Wallet & Settlements
  wallet: {
    async get(gymId) {
      return apiRequest(`/admin/gyms/${gymId}/wallet`);
    },

    async getTransactions(gymId, params = {}) {
      const q = new URLSearchParams(params).toString();
      return apiRequest(`/admin/gyms/${gymId}/wallet/transactions` + (q ? `?${q}` : ''));
    },

    async settle(gymId, payload = {}) {
      return apiRequest(`/admin/gyms/${gymId}/wallet/settle`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },

  // 7. Platform Audit Log
  audit: {
    async list(params = {}) {
      const q = new URLSearchParams(params).toString();
      return apiRequest('/admin/audit-logs' + (q ? `?${q}` : ''));
    },

    async log(action, model, obj, before, after) {
      const entry = {
        action,
        model,
        obj,
        before,
        after,
      };
      return apiRequest('/admin/audit-logs', {
        method: 'POST',
        body: JSON.stringify(entry),
      });
    },
  },

  // 8. Roles & Permissions
  roles: {
    async list() {
      return apiRequest('/admin/roles');
    },
  },

  // 9. Reviews & Replies
  reviews: {
    async reply(reviewId, payload) {
      return apiRequest(`/admin/reviews/${reviewId}/reply`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async deleteReply(reviewId) {
      return apiRequest(`/admin/reviews/${reviewId}/reply`, {
        method: 'DELETE',
      });
    },
  },

  // 10. Notifications & Push Broadcasts
  notifications: {
    async list() {
      return apiRequest('/admin/notifications');
    },

    async broadcast(payload) {
      return apiRequest('/admin/notifications', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },
};

export default adminClient;
