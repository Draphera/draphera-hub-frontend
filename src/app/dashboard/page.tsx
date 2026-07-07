'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { useTranslation } from '@/lib/i18n';
import { profileApi, adminApi } from '@/lib/api';
import type { Session } from '@supabase/supabase-js';

export default function DashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (!data.session) { router.push('/auth/signin?redirect=/dashboard'); return; }
      try {
        const p = await profileApi.get();
        setProfile(p);
      } catch { /* ignore */ }
      try {
        const a = await adminApi.check();
        setIsAdmin(a.is_admin);
      } catch { /* ignore */ }
      setLoading(false);
    });
  }, [router]);

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      const updates: Record<string, string> = {};
      for (const key of ['full_name', 'company_name', 'phone', 'address', 'website', 'vat_number']) {
        if (profile[key]) updates[key] = profile[key];
      }
      await profileApi.update(updates);
      setMsg(t('profile.saved'));
    } catch { setMsg(t('profile.error')); }
    setSaving(false);
  };

  const set = (k: string, v: string) => setProfile(p => ({ ...p, [k]: v }));

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-drapera-gold border-t-transparent rounded-full animate-spin" /></div>;
  if (!session) return null;

  const fields = [
    { key: 'full_name', label: t('profile.full_name') },
    { key: 'company_name', label: t('profile.company_name') },
    { key: 'phone', label: t('profile.phone') },
    { key: 'address', label: t('profile.address') },
    { key: 'website', label: t('profile.website') },
    { key: 'vat_number', label: t('profile.vat_number') },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div>
            <h1 className="section-title text-white">{t('dashboard.title')}</h1>
            <p className="text-drapera-steel-light mt-1">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Link href="/admin" className="btn-ghost text-xs px-3 py-1.5">
                {t('admin.title')}
              </Link>
            )}
            <Link href="/tools/hpgl" className="btn-gold text-xs px-3 py-1.5">
              {t('dashboard.open_hpgl')}
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <h2 className="font-display font-bold text-xl text-white mb-5">{t('profile.title')}</h2>
            <div className="premium-card space-y-4">
              {fields.map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                  <input
                    className="w-full bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-drapera-gold/50 transition-colors"
                    value={profile[f.key] ?? ''}
                    onChange={e => set(f.key, e.target.value)}
                    placeholder={f.label}
                  />
                </div>
              ))}
              <div className="pt-2">
                <button onClick={handleSave} disabled={saving} className="btn-gold text-sm px-5 py-2">
                  {saving ? '...' : t('profile.save')}
                </button>
                {msg && <span className="ml-3 text-xs text-drapera-gold">{msg}</span>}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="font-display font-bold text-xl text-white mb-5">{t('dashboard.tools')}</h2>
              <div className="grid gap-3">
                {[
                  { title: 'HPGL Viewer', href: '/tools/hpgl', active: true },
                  { title: 'ISO Viewer', href: '/tools/iso' },
                  { title: 'DXF Viewer', href: '/tools/dxf' },
                  { title: 'TechSheet Light', href: '/tools/techsheet-light' },
                ].map(tool => (
                  <Link key={tool.href} href={tool.active ? tool.href : '#'} onClick={e => { if (!tool.active) e.preventDefault(); }}>
                    <div className={`premium-card flex items-center justify-between ${tool.active ? 'border-drapera-gold/20' : 'opacity-40'}`}>
                      <span className="font-display font-semibold text-sm text-white">{tool.title}</span>
                      {tool.active ? (
                        <span className="text-[10px] text-drapera-gold font-medium">{t('dashboard.active')}</span>
                      ) : (
                        <span className="text-[10px] text-gray-600">{t('dashboard.soon')}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-display font-bold text-xl text-white mb-5">{t('dashboard.info')}</h2>
              <div className="premium-card space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-drapera-border/50">
                  <span className="text-xs text-gray-400">{t('dashboard.active_count')}</span>
                  <span className="text-sm text-drapera-gold font-bold">1</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-drapera-border/50">
                  <span className="text-xs text-gray-400">{t('dashboard.dev_count')}</span>
                  <span className="text-sm text-white font-bold">8</span>
                </div>
                <div className="pt-2">
                  <Link href="/tools/hpgl" className="btn-gold w-full text-center text-xs">{t('dashboard.go_hpgl')}</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
