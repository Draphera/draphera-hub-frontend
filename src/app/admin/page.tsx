'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { useTranslation } from '@/lib/i18n';
import { adminApi } from '@/lib/api';
import type { Session } from '@supabase/supabase-js';

interface Upload {
  id: string; user_id: string; filename: string; file_type: string;
  file_size: number; content_hash: string; created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  hpgl: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  iso: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  dxf: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export default function AdminPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [msg, setMsg] = useState('');
  const [cleanInput, setCleanInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authAlg, setAuthAlg] = useState('');
  const [filterType, setFilterType] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = async (ft: string) => {
    try {
      const u = ft ? await adminApi.listUploads(ft) : await adminApi.listUploads();
      setUploads(u.uploads ?? []);
    } catch (e: any) { setMsg(`Errore: ${e.message}`); }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (!data.session) { router.push('/auth/signin?redirect=/admin'); return; }
      try {
        const a = await adminApi.check();
        if (a.alg) setAuthAlg(a.alg);
        if (a.error) setAuthError(`${a.error}: ${a.detail || ''}`);
        setIsAdmin(a.is_admin);
        if (a.is_admin) await load('');
      } catch { setIsAdmin(false); }
      setLoading(false);
    });
  }, [router]);

  const handleFilter = async (ft: string) => {
    setFilterType(ft);
    await load(ft);
  };

  const handleExportZip = async () => {
    setExporting(true);
    try {
      const blob = filterType ? await adminApi.exportZip(filterType) : await adminApi.exportZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `uploads-${filterType || 'all'}.zip`; a.click();
      URL.revokeObjectURL(url);
    } catch { setMsg(t('admin.error')); }
    setExporting(false);
  };

  const handleDownload = async (id: string) => {
    try {
      const content = await adminApi.downloadUpload(id);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'download.hpgl'; a.click();
      URL.revokeObjectURL(url);
    } catch { setMsg(t('admin.error')); }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteUpload(id);
      setUploads(prev => prev.filter(u => u.id !== id));
      setMsg(t('admin.deleted'));
    } catch { setMsg(t('admin.error')); }
  };

  const handleClean = async () => {
    if (cleanInput !== 'DELETE_ALL') return;
    try {
      await adminApi.cleanAll(filterType || undefined);
      setUploads([]);
      setCleanInput('');
      setMsg(t('admin.cleaned'));
    } catch { setMsg(t('admin.error')); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-drapera-gold border-t-transparent rounded-full animate-spin" /></div>;
  if (!session) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-10 pt-24 text-center">
          <h1 className="section-title text-white mb-4">{t('admin.title')}</h1>
          <p className="text-drapera-steel-light mb-3">{t('admin.no_access')}</p>
          {authError && (
            <div className="inline-block px-4 py-2 rounded-lg bg-red-900/20 border border-red-500/30 text-xs text-red-400 font-mono whitespace-pre text-left">
              {authError}{authAlg ? `\nalg: ${authAlg}` : ''}
            </div>
          )}
        </div>
      </div>
    );
  }

  const filters = ['', 'hpgl', 'iso', 'dxf'];

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="section-title text-white">{t('admin.title')}</h1>
            <p className="text-drapera-steel-light mt-1">{t('admin.total')}: {uploads.length}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/dashboard" className="btn-ghost text-xs px-3 py-1.5">{t('nav.dashboard')}</Link>
          </div>
        </div>

        {msg && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-drapera-gold/10 border border-drapera-gold/20 text-xs text-drapera-gold">
            {msg}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {filters.map(f => (
            <button key={f || 'all'} onClick={() => handleFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                filterType === f
                  ? 'bg-drapera-gold/20 border-drapera-gold/40 text-drapera-gold'
                  : 'border-drapera-border text-gray-500 hover:text-white hover:border-drapera-gold/30'
              }`}
            >
              {f ? f.toUpperCase() : 'ALL'}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={handleExportZip} disabled={exporting || uploads.length === 0}
            className="btn-gold text-xs px-3 py-1.5"
          >
            {exporting ? '...' : 'Download ZIP'}
          </button>
        </div>

        <div className="premium-card overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-drapera-border text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">{t('admin.filename')}</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">{t('admin.user')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.date')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.size')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('admin.download')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('admin.delete')}</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map(u => (
                  <tr key={u.id} className="border-b border-drapera-border/50 text-gray-300 hover:bg-white/5">
                    <td className="px-4 py-3 text-white font-mono text-xs max-w-[200px] truncate">{u.filename}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded border ${TYPE_COLORS[u.file_type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                        {u.file_type?.toUpperCase() || '?'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{u.user_id?.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs">{(u.file_size / 1024).toFixed(1)} KB</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDownload(u.id)} className="text-drapera-gold hover:text-amber-400 text-xs">{t('admin.download')}</button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-300 text-xs">{t('admin.delete')}</button>
                    </td>
                  </tr>
                ))}
                {uploads.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-600 text-xs">Nessun upload presente</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="premium-card">
            <h3 className="font-display font-bold text-base text-white mb-3">{t('admin.clean_all')}</h3>
            <p className="text-xs text-gray-500 mb-2">
              {filterType ? `Filtro attivo: ${filterType.toUpperCase()}` : 'Tutti i file'}
            </p>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-red-500/50 transition-colors"
                value={cleanInput}
                onChange={e => setCleanInput(e.target.value)}
                placeholder={t('admin.clean_confirm')}
              />
              <button
                onClick={handleClean}
                disabled={cleanInput !== 'DELETE_ALL'}
                className="px-4 py-2 bg-red-600/20 border border-red-600/40 text-red-400 text-xs font-medium rounded-lg hover:bg-red-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {t('admin.clean_btn')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
