'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { useTranslation } from '@/lib/i18n';
import { profileApi } from '@/lib/api';
import type { Session } from '@supabase/supabase-js';

export default function SettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (!data.session) { router.push('/auth/signin?redirect=/dashboard/settings'); return; }
      try {
        const p = await profileApi.get();
        setProfile(p);
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

  const initials = session.user?.email?.[0]?.toUpperCase() || '?';

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-drapera-gold transition-colors mb-6">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {t('profile.back')}
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-drapera-gold to-amber-500 flex items-center justify-center text-xl font-bold text-drapera-dark">
            {initials}
          </div>
          <div>
            <h1 className="section-title text-white text-2xl">{t('profile.title')}</h1>
            <p className="text-sm text-drapera-steel-light mt-0.5">{session.user?.email}</p>
          </div>
        </div>

        <div className="premium-card p-6 space-y-5">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-400 mb-1.5 block">{f.label}</label>
              <input
                className="w-full bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-drapera-gold/50 transition-colors"
                value={profile[f.key] ?? ''}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.label}
              />
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-gold text-sm px-6 py-2.5">
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-drapera-dark border-t-transparent rounded-full animate-spin" />
                  ...
                </span>
              ) : t('profile.save')}
            </button>
            {msg && (
              <span className={`text-xs ${msg === t('profile.saved') ? 'text-green-400' : 'text-red-400'}`}>
                {msg}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
