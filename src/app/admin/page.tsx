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
  id: string; user_id: string; filename: string;
  file_size: number; content_hash: string; created_at: string;
}

export default function AdminPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [msg, setMsg] = useState('');
  const [cleanInput, setCleanInput] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (!data.session) { router.push('/auth/signin?redirect=/admin'); return; }
      try {
        const a = await adminApi.check();
        setIsAdmin(a.is_admin);
        if (a.is_admin) {
          const u = await adminApi.listUploads();
          setUploads(u.uploads ?? []);
        }
      } catch { setIsAdmin(false); }
      setLoading(false);
    });
  }, [router]);

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
      await adminApi.cleanAll();
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
          <p className="text-drapera-steel-light">{t('admin.no_access')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-title text-white">{t('admin.title')}</h1>
            <p className="text-drapera-steel-light mt-1">{t('admin.total')}: {uploads.length}</p>
          </div>
          <Link href="/dashboard" className="btn-ghost text-xs px-3 py-1.5">{t('nav.dashboard')}</Link>
        </div>

        {msg && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-drapera-gold/10 border border-drapera-gold/20 text-xs text-drapera-gold">
            {msg}
          </div>
        )}

        <div className="premium-card overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-drapera-border text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">{t('admin.filename')}</th>
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
                    <td className="px-4 py-3 text-white font-mono text-xs">{u.filename}</td>
                    <td className="px-4 py-3 text-xs">{u.user_id?.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs">{u.file_size} B</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDownload(u.id)} className="text-drapera-gold hover:text-amber-400 text-xs">{t('admin.download')}</button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-300 text-xs">{t('admin.delete')}</button>
                    </td>
                  </tr>
                ))}
                {uploads.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600 text-xs">Nessun upload presente</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="premium-card">
          <h3 className="font-display font-bold text-base text-white mb-3">{t('admin.clean_all')}</h3>
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
  );
}
