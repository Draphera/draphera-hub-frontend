import { supabase } from './supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

async function getHeaders() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const { data } = await supabase.auth.getSession();
  if (data?.session?.access_token) {
    headers['Authorization'] = `Bearer ${data.session.access_token}`;
  }
  return headers;
}

export const api = {
  async get<T>(endpoint: string) {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}${endpoint}`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as T;
  },
  async post<T>(endpoint: string, body: unknown) {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST', headers, body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as T;
  },
  async upload<T>(endpoint: string, formData: FormData) {
    const headers = await getHeaders();
    const { Authorization, ...rest } = headers;
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { ...rest, Authorization: Authorization || '' },
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as T;
  },
};

export const profileApi = {
  async get() {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/api/profile`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async update(data: Record<string, string>) {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/api/profile`, {
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
      const res = await fetch(`${API_BASE}/api/admin/check`, { headers });
      return res.ok ? res.json() : { is_admin: false };
    } catch { return { is_admin: false }; }
  },
  async listUploads(type?: string) {
    const headers = await getHeaders();
    const url = type ? `${API_BASE}/api/admin/uploads?type=${type}` : `${API_BASE}/api/admin/uploads`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async exportZip(type?: string) {
    const headers = await getHeaders();
    const url = type ? `${API_BASE}/api/admin/uploads/export-zip?type=${type}` : `${API_BASE}/api/admin/uploads/export-zip`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
  async downloadUpload(id: string) {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/api/admin/uploads/${id}/download`, { headers });
    if (!res.ok) throw new Error(await res.text());
    return res.text();
  },
  async deleteUpload(id: string) {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/api/admin/uploads/${id}`, { method: 'DELETE', headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async cleanAll(type?: string) {
    const headers = await getHeaders();
    const url = type
      ? `${API_BASE}/api/admin/uploads?confirm=DELETE_ALL&type=${type}`
      : `${API_BASE}/api/admin/uploads?confirm=DELETE_ALL`;
    const res = await fetch(url, { method: 'DELETE', headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

export const hpglApi = {
  async parse(file: File) {
    const form = new FormData(); form.append('file', file);
    const headers = await getHeaders();
    const { Authorization } = headers;
    const res = await fetch(`${API_BASE}/api/hpgl/parse`, {
      method: 'POST', headers: { Authorization: Authorization || '' }, body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async exportSvg(file: File) {
    const form = new FormData(); form.append('file', file);
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/api/hpgl/export/svg`, {
      method: 'POST', headers: { Authorization: headers.Authorization || '' }, body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.text();
  },
  async exportPng(file: File) {
    const form = new FormData(); form.append('file', file);
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/api/hpgl/export/png`, {
      method: 'POST', headers: { Authorization: headers.Authorization || '' }, body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
  async exportZip(file: File) {
    const form = new FormData(); form.append('file', file);
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}/api/hpgl/export/zip`, {
      method: 'POST', headers: { Authorization: headers.Authorization || '' }, body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
};
