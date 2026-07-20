import { supabase } from './supabase';

const API_BASE = '';

async function getHeaders() {
  const headers: Record<string, string> = {};
  const { data } = await supabase.auth.getSession();
  if (data?.session?.access_token) {
    headers['Authorization'] = `Bearer ${data.session.access_token}`;
  }
  return headers;
}

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export const api = {
  async get<T>(endpoint: string) {
    const headers = await getHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetchWithTimeout(`${API_BASE}${endpoint}`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as T;
  },
  async post<T>(endpoint: string, body: unknown) {
    const headers = await getHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetchWithTimeout(`${API_BASE}${endpoint}`, {
      method: 'POST', headers, body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as T;
  },
};

export const profileApi = {
  async get() {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/profile`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async update(data: Record<string, unknown>) {
    const headers = await getHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetchWithTimeout(`${API_BASE}/api/profile`, {
      method: 'PUT', headers, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

export const adminApi = {
  async check() {
    try {
      const headers = await getHeaders();
      const res = await fetchWithTimeout(`${API_BASE}/api/admin/check`, { headers });
      return res.ok ? res.json() : { is_admin: false };
    } catch { return { is_admin: false }; }
  },
  async listProfiles(limit = 50, offset = 0, search = '') {
    const headers = await getHeaders();
    const params = `limit=${limit}&offset=${offset}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/profiles?${params}`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ profiles: Array<Record<string, unknown>>; total: number }>;
  },
  async updateProfile(profileId: string, data: Record<string, string>) {
    const headers = await getHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/profiles/${profileId}`, {
      method: 'PUT', headers, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async listFounders() {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/founders`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ founders: Array<Record<string, unknown>>; total: number }>;
  },
  async addFounder(userId: string) {
    const headers = await getHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/founders`, {
      method: 'POST', headers, body: JSON.stringify({ user_id: userId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async deleteFounder(userId: string) {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/founders/${userId}`, {
      method: 'DELETE', headers,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async stats() {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/stats`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{
      total_profiles: number;
      total_founders: number;
      waitlist_count: number;
      total_uploads: number;
      uploads_by_type: Record<string, number>;
      uploads_by_vendor: Record<string, number>;
      uploads_by_month: Record<string, number>;
      top_uploaders: Record<string, number>;
      training_samples: number;
      registration: { max_users: number; current_users: number; registration_open: boolean };
    }>;
  },
  async listUploads(type?: string, limit = 50, offset = 0, cad?: string) {
    const headers = await getHeaders();
    const params = `limit=${limit}&offset=${offset}`;
    let url = `${API_BASE}/api/admin/uploads?${params}`;
    if (type) url += `&type=${type}`;
    if (cad) url += `&cad=${cad}`;
    const res = await fetchWithTimeout(url, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async exportZip(type?: string, cad?: string) {
    const headers = await getHeaders();
    let url = `${API_BASE}/api/admin/uploads/export-zip`;
    const params: string[] = [];
    if (type) params.push(`type=${type}`);
    if (cad) params.push(`cad=${cad}`);
    if (params.length) url += `?${params.join('&')}`;
    const res = await fetchWithTimeout(url, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
  async downloadUpload(id: string) {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/uploads/${id}/download`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
  async deleteUpload(id: string) {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/uploads/${id}`, { method: 'DELETE', headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async cleanAll(type?: string) {
    const headers = await getHeaders();
    const url = type
      ? `${API_BASE}/api/admin/uploads?confirm=DELETE_ALL&type=${type}`
      : `${API_BASE}/api/admin/uploads?confirm=DELETE_ALL`;
    const res = await fetchWithTimeout(url, { method: 'DELETE', headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async systemHealth() {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/system/health`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{
      status: string; supabase_url: string; python_version: string;
      fastapi_version: string; admin_emails: number;
      ml_model: { loaded: boolean; exists: boolean; in_memory: boolean; in_supabase: boolean };
      tables: Array<{ table: string; reachable: boolean; count: number; error?: string }>;
    }>;
  },
  async loadModel() {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/system/load-model`, { method: 'POST', headers });
    if (!res.ok) throw new Error((await res.json()).detail || await res.text());
    return res.json() as Promise<{ loaded: boolean; source: string; classes?: string[] }>;
  },
  async listBetaApplications(status?: string) {
    const headers = await getHeaders();
    const qs = status ? `?status=${status}` : '';
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/beta-applications${qs}`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ applications: Array<Record<string, unknown>>; count: number }>;
  },
  async approveBetaApplication(appId: string) {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/beta-applications/${appId}/approve`, { method: 'POST', headers });
    if (!res.ok) throw new Error((await res.json()).detail || await res.text());
    return res.json();
  },
  async rejectBetaApplication(appId: string) {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/beta-applications/${appId}/reject`, { method: 'POST', headers });
    if (!res.ok) throw new Error((await res.json()).detail || await res.text());
    return res.json();
  },
  async assignBadge(userId: string, badgeId: string) {
    const headers = await getHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/badges/assign`, { method: 'POST', headers, body: JSON.stringify({ user_id: userId, badge_id: badgeId }) });
    if (!res.ok) throw new Error((await res.json()).detail || await res.text());
    return res.json();
  },
  async listFeatureFlags() {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/feature-flags`, { headers });
    return res.json();
  },
  async updateFeatureFlag(key: string, enabled: boolean) {
    const headers = await getHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/feature-flags/${key}`, { method: 'PUT', headers, body: JSON.stringify({ enabled }) });
    return res.json();
  },
};

export const userApi = {
  async uploads(limit = 50, offset = 0) {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/profile/uploads?limit=${limit}&offset=${offset}`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ uploads: Array<Record<string, unknown>>; total: number }>;
  },
  async stats() {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/profile/stats`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ total_uploads: number }>;
  },
  async submitBetaApplication(data: Record<string, string>) {
    const headers = await getHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetchWithTimeout(`${API_BASE}/api/profile/beta/apply`, { method: 'POST', headers, body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json()).detail || await res.text());
    return res.json();
  },
  async getBetaApplication() {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/profile/beta/application`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async getFeatureFlags() {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/profile/feature-flags`, { headers });
    if (!res.ok) return { flags: [] };
    return res.json();
  },
  async submitBugReport(data: { description: string; page?: string; email?: string }) {
    const headers = await getHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetchWithTimeout(`${API_BASE}/api/profile/bug-report`, { method: 'POST', headers, body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json()).detail || await res.text());
    return res.json();
  },
  async getBadges() {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/profile/badges`, { headers });
    if (!res.ok) return { badges: [] };
    return res.json();
  },
  async unlockTetrisBadge() {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/profile/badge/tetris-unlock`, { method: 'POST', headers });
    if (!res.ok) throw new Error((await res.json()).detail || await res.text());
    return res.json();
  },
};

export const adminCadApi = {
  async list() {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/cad`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async create(data: { id: string; name: string; description?: string; color?: string; country?: string }) {
    const headers = await getHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/cad`, {
      method: 'POST', headers, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async update(cadId: string, data: Record<string, unknown>) {
    const headers = await getHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/cad/${cadId}`, {
      method: 'PUT', headers, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async delete(cadId: string) {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/cad/${cadId}`, {
      method: 'DELETE', headers,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async train(files: File[], cadId: string) {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    form.append('cad_id', cadId);
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/cad/train`, {
      method: 'POST',
      headers: { Authorization: headers.Authorization || '' },
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async setUploadCad(uploadId: string, cadId: string) {
    const headers = await getHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/uploads/${uploadId}/cad`, {
      method: 'POST', headers, body: JSON.stringify({ cad_id: cadId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

export const detectionRulesApi = {
  async list() {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/detection-rules`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async create(data: { rule_type: string; cad_id: string; pattern: string }) {
    const headers = await getHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/detection-rules`, {
      method: 'POST', headers, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async remove(ruleId: number) {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/detection-rules/${ruleId}`, {
      method: 'DELETE', headers,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async reload() {
    const headers = await getHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/detection-rules/reload`, {
      method: 'POST', headers,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

export const correctionApi = {
  async submitCorrection(cadId: string, features: Record<string, unknown>, fileId = '', uploadId = '') {
    const headers = await getHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/cad/correct`, {
      method: 'POST', headers, body: JSON.stringify({ cad_id: cadId, features, file_id: fileId, upload_id: uploadId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

export const waitlistApi = {
  async list(limit = 50, offset = 0, search = '') {
    const headers = await getHeaders();
    const params = `limit=${limit}&offset=${offset}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/waitlist?${params}`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ records: Array<Record<string, unknown>>; total: number }>;
  },
  async stats() {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/waitlist/stats`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ total: number; pending: number; approved: number; avg_wait_days: number }>;
  },
  async approve(email: string) {
    const headers = await getHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/waitlist/approve`, {
      method: 'POST', headers, body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async approveAndFounder(email: string) {
    const headers = await getHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/waitlist/approve-and-founder`, {
      method: 'POST', headers, body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async getRegState() {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/registration-state`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async updateRegState(data: Record<string, number | boolean>) {
    const headers = await getHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/registration-state`, {
      method: 'PUT', headers, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

export const trainingApi = {
  async trainModel() {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/cad/train-model`, {
      method: 'POST', headers,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async getTrainingData(cadId?: string) {
    const headers = await getHeaders();
    const url = cadId ? `${API_BASE}/api/admin/cad/training-data?cad_id=${cadId}` : `${API_BASE}/api/admin/cad/training-data`;
    const res = await fetchWithTimeout(url, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async getFeatureKeys() {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/cad/feature-keys`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async getTrainingStats() {
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/admin/cad/training-stats`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{
      total_samples: number; unique_classes: number;
      by_class: Record<string, number>; by_class_raw: Record<string, number>;
    }>;
  },
};

export const hpglApi = {
  async parse(file: File) {
    const form = new FormData(); form.append('file', file);
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/hpgl/parse`, {
      method: 'POST', headers: { Authorization: headers.Authorization || '' }, body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async exportSvg(file: File) {
    const form = new FormData(); form.append('file', file);
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/hpgl/export/svg`, {
      method: 'POST', headers: { Authorization: headers.Authorization || '' }, body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.text();
  },
  async exportPng(file: File) {
    const form = new FormData(); form.append('file', file);
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/hpgl/export/png`, {
      method: 'POST', headers: { Authorization: headers.Authorization || '' }, body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
  async exportZip(file: File) {
    const form = new FormData(); form.append('file', file);
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/hpgl/export/zip`, {
      method: 'POST', headers: { Authorization: headers.Authorization || '' }, body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
  async pieces(file: File) {
    const form = new FormData(); form.append('file', file);
    const headers = await getHeaders();
    const res = await fetchWithTimeout(`${API_BASE}/api/hpgl/pieces`, {
      method: 'POST', headers: { Authorization: headers.Authorization || '' }, body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
