'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { useTranslation } from '@/lib/i18n';
import { profileApi } from '@/lib/api';
import type { Session } from '@supabase/supabase-js';

const API_BASE = '';

export default function SettingsPage() {
  const { lang, t } = useTranslation();
  const _ = useCallback((it: string, en: string) => lang === 'en' ? en : it, [lang]);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [cadSystems, setCadSystems] = useState<Array<{ id: string; name: string; training_ready?: boolean; country?: string }>>([]);
  const [founder, setFounder] = useState<{ is_founder: boolean; is_beta?: boolean; position?: number; is_admin?: boolean } | null>(null);
  const [betaApp, setBetaApp] = useState<{ status: string; founder_position?: number } | null>(null);
  const [uploadCount, setUploadCount] = useState(0);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'social' | 'badges' | 'account'>('profile');
  const [badges, setBadges] = useState<Array<{ id: string; name: string; icon: string; rarity: string; unlocked: boolean; description?: string }>>([]);
  const fileRef = useRef<HTMLInputElement>(null);

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
    fetch(`${API_BASE}/api/profile/cad-systems`)
      .then(r => r.json())
      .then(data => setCadSystems(data.cad_systems ?? []))
      .catch(() => {});
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.access_token) {
        fetch(`${API_BASE}/api/profile/founder-status`, {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        }).then(r => r.json()).then(setFounder).catch(() => {});
        fetch(`${API_BASE}/api/profile/beta/application`, {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        }).then(r => r.ok ? r.json() : null).then(d => setBetaApp(d?.application ?? null)).catch(() => {});
        fetch(`${API_BASE}/api/profile/stats`, {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        }).then(r => r.ok ? r.json() : null).then(d => { if (d) setUploadCount(d.total_uploads ?? 0); }).catch(() => {});
        fetch(`${API_BASE}/api/profile/badges`, {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        }).then(r => r.ok ? r.json() : null).then(d => { if (d?.badges) setBadges(d.badges); }).catch(() => {});
      }
    });
  }, [router]);

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      const updates: Record<string, string> = {};
      for (const key of ['full_name', 'company_name', 'phone', 'address', 'website', 'vat_number', 'cad_system', 'cad_system_other', 'office', 'linkedin_url', 'facebook_url', 'instagram_url', 'github_url']) {
        const v = profile[key];
        if (v !== undefined && v !== null) updates[key] = v;
      }
      const pp = profile['public_profile'];
      if (pp !== undefined && pp !== null) {
        (updates as Record<string, unknown>)['public_profile'] = pp === 'true';
      }
      await profileApi.update(updates);
      setMsg(t('profile.saved'));
    } catch { setMsg(t('profile.error')); }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const headers: Record<string, string> = {};
      const { data: sess } = await supabase.auth.getSession();
      if (sess?.session?.access_token) {
        headers['Authorization'] = `Bearer ${sess.session.access_token}`;
      }
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/api/profile/avatar`, {
        method: 'POST', headers: { Authorization: headers['Authorization'] || '' }, body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setProfile(p => ({ ...p, avatar_url: data.avatar_url }));
      setMsg(t('profile.saved'));
    } catch {
      setMsg(t('profile.error'));
    }
    setAvatarUploading(false);
  };

  const set = (k: string, v: string) => setProfile(p => ({ ...p, [k]: v }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-drapera-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!session) return null;

  const OFFICE_OPTIONS = [
    { value: '', label: t('settings.select_office') },
    { value: 'modellistica', label: t('settings.office_modellista') },
    { value: 'produzione', label: t('settings.office_produzione') },
    { value: 'fornitore', label: t('settings.office_fornitore') },
    { value: 'freelance', label: t('settings.office_freelance') },
  ];

  const fields = [
    { key: 'full_name', label: t('profile.full_name') },
    { key: 'company_name', label: t('profile.company_name') },
    { key: 'phone', label: t('profile.phone') },
    { key: 'address', label: t('profile.address') },
    { key: 'website', label: t('profile.website') },
    { key: 'vat_number', label: t('profile.vat_number') },
  ];

  const initials = profile.full_name?.[0]?.toUpperCase() || session.user?.email?.[0]?.toUpperCase() || '?';
  const avatarUrl = profile.avatar_url;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-drapera-gold transition-colors mb-6">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {t('profile.back')}
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <div className="relative group">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-drapera-gold to-amber-500 flex items-center justify-center text-xl font-bold text-drapera-dark overflow-hidden">
              {avatarUrl ? <Image src={avatarUrl} alt="" width={80} height={80} className="w-full h-full object-cover" /> : initials}
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={avatarUploading}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer border-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="section-title text-white text-2xl">{t('profile.title')}</h1>
            <p className="text-sm text-drapera-steel-light mt-0.5 truncate">{session.user?.email}</p>
            {profile.full_name && (
              <p className="text-xs text-drapera-gold mt-0.5">{profile.full_name}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">

        {founder?.is_admin && (
          <div className="premium-card p-2.5 border border-amber-500/20 overflow-hidden relative" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))' }}>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
              </div>
              <div>
                <p className="text-sm text-white font-semibold">Admin</p>
                <p className="text-[11px] text-gray-500">Amministratore di sistema</p>
              </div>
            </div>
          </div>
        )}

        {(founder?.is_founder || founder?.is_beta) && (
          <div className="premium-card p-2.5 border border-amber-500/20 overflow-hidden relative" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.02))' }}>
            <div className="flex items-center gap-3 relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${founder.position && founder.position <= 10 ? 'bg-gradient-to-br from-amber-400 to-yellow-600 shadow-amber-500/20' : 'bg-gradient-to-br from-cyan-400 to-blue-600 shadow-cyan-500/20'}`}>
                {founder.position && founder.position <= 10 ? (
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                ) : (
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white font-semibold">{founder.position && founder.position <= 10 ? t('settings.founder_badge') : 'Beta Tester'}</p>
                  <span className={`text-xs font-bold ${founder.position && founder.position <= 10 ? 'text-amber-400' : 'text-cyan-400'}`}>#{founder.position ?? '?'}</span>
                </div>
                <p className="text-[11px] text-gray-500">{t('settings.founder_subtitle')}</p>
              </div>
            </div>
          </div>
        )}

        {founder?.is_beta && !founder?.is_founder && betaApp === null && (
          <div className="premium-card p-2.5 border border-emerald-500/20 overflow-hidden relative" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))' }}>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base text-white font-bold">{t('settings.beta_apply')}</p>
                <p className="text-[11px] text-gray-500">{t('settings.founder_subtitle')}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-drapera-border/30 rounded-full overflow-hidden">
                    <div className="h-full bg-drapera-gold rounded-full transition-all" style={{ width: `${Math.min(100, (uploadCount / 50) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-drapera-gold font-mono whitespace-nowrap">{uploadCount}/50 {(t as any)('profile.files') || 'file'}</span>
                </div>
                {uploadCount < 50 && <p className="text-[9px] text-gray-500 mt-1">{50 - uploadCount} file ancora necessari per candidarti</p>}
              </div>
            </div>
            {uploadCount >= 50 && (
              <Link href="/beta" className="mt-3 block w-full text-center px-3 py-2 rounded-lg bg-drapera-gold/10 text-drapera-gold text-xs font-semibold hover:bg-drapera-gold/20 transition-colors border border-drapera-gold/20">
                {t('settings.beta_apply')} →
              </Link>
            )}
          </div>
        )}

        {betaApp?.status === 'pending' && (
          <div className="premium-card p-2.5 border border-yellow-500/20 overflow-hidden relative" style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.08), rgba(234,179,8,0.02))' }}>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shrink-0 shadow-md shadow-yellow-500/20">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-sm text-white font-semibold">{t('settings.beta_pending')}</p>
                <p className="text-[11px] text-gray-500">{t('settings.founder_subtitle')}</p>
              </div>
            </div>
          </div>
        )}

        {betaApp?.status === 'approved' && (
          <div className="premium-card p-2.5 border border-blue-500/20 overflow-hidden relative" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.02))' }}>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white font-semibold">{t('settings.beta_badge')}</p>
                  <span className="text-xs font-bold text-blue-400">#{betaApp.founder_position ?? '?'}</span>
                </div>
                <p className="text-[11px] text-gray-500">{t('settings.founder_subtitle')}</p>
              </div>
            </div>
          </div>
        )}

        {badges.find(b => b.id === 'custode')?.unlocked && (
          <div className="premium-card p-2.5 border border-red-500/20 overflow-hidden relative" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))' }}>
            <div className="flex items-center gap-2 relative z-10">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center shrink-0 shadow-md shadow-red-500/20">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white font-semibold truncate">{badges.find(b => b.id === 'custode')?.name || 'Custode'}</p>
                <p className="text-[9px] text-red-400/70 uppercase tracking-wider">Mythic</p>
              </div>
            </div>
          </div>
        )}

        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-drapera-border overflow-hidden mb-6">
          <button onClick={() => setSettingsTab('profile')}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${settingsTab === 'profile' ? 'bg-drapera-gold/10 text-drapera-gold border-b-2 border-drapera-gold' : 'text-gray-500 hover:text-white'}`}>
            {_('Profilo', 'Profile')}
          </button>
          <button onClick={() => setSettingsTab('social')}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${settingsTab === 'social' ? 'bg-drapera-gold/10 text-drapera-gold border-b-2 border-drapera-gold' : 'text-gray-500 hover:text-white'}`}>
            {_('Social', 'Social')}
          </button>
          <button onClick={() => setSettingsTab('badges')}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${settingsTab === 'badges' ? 'bg-drapera-gold/10 text-drapera-gold border-b-2 border-drapera-gold' : 'text-gray-500 hover:text-white'}`}>
            {_('Badge', 'Badges')}
          </button>
          <button onClick={() => setSettingsTab('account')}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${settingsTab === 'account' ? 'bg-drapera-gold/10 text-drapera-gold border-b-2 border-drapera-gold' : 'text-gray-500 hover:text-white'}`}>
            {_('Account', 'Account')}
          </button>
        </div>

        {settingsTab === 'profile' && (
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
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">{t('profile.cad_system')}</label>
            <select
              className="w-full bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-drapera-gold/50 transition-colors appearance-none cursor-pointer"
              value={profile.cad_system === '__other__' ? '__other__' : profile.cad_system ?? ''}
              onChange={e => {
                set('cad_system', e.target.value);
                if (e.target.value !== '__other__') set('cad_system_other', '');
              }}
            >
              <option value="">{t('cad.none')}</option>
              {cadSystems.filter(s => s.training_ready).length > 0 && (
                <optgroup label={t('cad.trained')}>
                  {cadSystems.filter(s => s.training_ready).map(s => (
                    <option key={s.id} value={s.id}>{s.name}{s.country ? ` [${s.country}]` : ''}</option>
                  ))}
                </optgroup>
              )}
              {cadSystems.filter(s => !s.training_ready).length > 0 && (
                <optgroup label={t('cad.other')}>
                  {cadSystems.filter(s => !s.training_ready).map(s => (
                    <option key={s.id} value={s.id}>{s.name}{s.country ? ` [${s.country}]` : ''}</option>
                  ))}
                </optgroup>
              )}
              <option value="__other__">{t('cad.other')}...</option>
            </select>
            {profile.cad_system === '__other__' && (
              <input
                className="mt-2 w-full bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-drapera-gold/50 transition-colors"
                value={profile.cad_system_other ?? ''}
                onChange={e => set('cad_system_other', e.target.value)}
                placeholder="Specifica il CAD che utilizzi..."
              />
            )}
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">{t('settings.office_label')}</label>
            <select
              className="w-full bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-drapera-gold/50 transition-colors appearance-none cursor-pointer"
              value={profile.office ?? ''}
              onChange={e => set('office', e.target.value)}
            >
              {OFFICE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
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
        )}

        {settingsTab === 'social' && (
        <div className="premium-card p-6 space-y-5">
          <div className="flex items-center justify-between py-3 px-1">
            <div>
              <p className="text-xs text-gray-400 font-medium">Mostrami nella community</p>
              <p className="text-[10px] text-gray-600 mt-0.5">Il tuo nome sarà visibile nella pagina Community di Draphera Hub.</p>
            </div>
            <button onClick={async () => {
              const next = profile.public_profile === 'true' ? 'false' : 'true';
              set('public_profile', next);
              try {
                await profileApi.update({ public_profile: next === 'true' });
                setMsg(t('profile.saved'));
              } catch { setMsg(t('profile.error')); }
            }}
              className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${profile.public_profile === 'true' ? 'bg-drapera-gold' : 'bg-drapera-border'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${profile.public_profile === 'true' ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="h-px bg-drapera-border/40 my-2" />
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{t('profile.social_title')}</p>
          {[
            { key: 'linkedin_url', label: 'LinkedIn', icon: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z' },
            { key: 'facebook_url', label: 'Facebook', icon: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3V2z' },
            { key: 'instagram_url', label: 'Instagram', icon: 'M16 4H8a4 4 0 00-4 4v8a4 4 0 004 4h8a4 4 0 004-4V8a4 4 0 00-4-4zm-4 11a3 3 0 110-6 3 3 0 010 6zm3.5-6.5a1 1 0 110-2 1 1 0 010 2z' },
            { key: 'github_url', label: 'GitHub', icon: 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z' },
          ].map(s => (
            <div key={s.key}>
              <label className="text-xs text-gray-400 mb-1.5 block flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d={s.icon} /></svg>
                {s.label}
              </label>
              <input
                className="w-full bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-drapera-gold/50 transition-colors"
                value={profile[s.key] ?? ''}
                onChange={e => set(s.key, e.target.value)}
                placeholder={'https://' + s.key.replace('_url', '.com/...')}
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
          </div>
        </div>
        )}

        {settingsTab === 'badges' && (
        <div className="premium-card p-6 space-y-5">
          <div className="h-px bg-drapera-border/40 my-6" />
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">{_('Badge', 'Badges')}</p>

          {/* Ordinary badges */}
          <p className="text-[9px] text-gray-600 font-medium uppercase tracking-wider mb-2">{_('Ordinary', 'Ordinary')}</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {badges.filter(b => b.id !== 'tetris_secret').map(b => {
              const rarityColors: Record<string, string> = {
                rare: 'border-blue-500/30 text-blue-400 bg-blue-500/5',
                extra_rare: 'border-amber-500/30 text-amber-400 bg-amber-500/5',
                ultra_secret: 'border-purple-500/30 text-purple-400 bg-purple-500/5',
                legendary: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5',
                mythic: 'border-red-500/30 text-red-400 bg-red-500/5',
              };
              const iconSvgs: Record<string, string> = {
                square: 'M3.75 3.75v16.5h16.5V3.75H3.75z',
                hexagon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
                triangle: 'M12 2L2 22h20L12 2z',
                diamond: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
                circle: 'M12 2a10 10 0 100 20 10 10 0 000-20z',
                shield: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
              };
              return (
                <div key={b.id} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border ${b.unlocked ? rarityColors[b.rarity] || 'border-gray-500/20 text-gray-400' : 'border-drapera-border/30 text-gray-700 opacity-50'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${b.unlocked ? 'bg-gradient-to-br from-blue-500/20 to-transparent' : ''}`}>
                    {b.id === 'tetris_secret' && !b.unlocked ? (
                      <span className="text-[10px] font-bold text-gray-700">?</span>
                    ) : (
                      <svg className={`w-4 h-4 ${b.unlocked ? 'text-current' : 'text-gray-700'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d={iconSvgs[b.icon] || iconSvgs.square} />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${b.unlocked ? 'text-white' : 'text-gray-600'}`}>
                      {b.id === 'tetris_secret' && !b.unlocked ? '???' : b.name}
                    </p>
                    <p className={`text-[8px] uppercase tracking-wider ${b.unlocked ? `opacity-60 ${rarityColors[b.rarity]?.split(' ')[1] || 'text-gray-500'}` : 'text-gray-700'}`}>
                      {b.rarity === 'extra_rare' ? 'Extra Rare' : b.rarity === 'ultra_secret' ? 'Ultra Secret' : b.rarity?.charAt(0).toUpperCase() + b.rarity?.slice(1)}
                    </p>
                    <p className="text-[7px] text-gray-600 leading-tight mt-0.5">{b.description || ''}</p>
                  </div>
                  {!b.unlocked && (
                    <svg className="w-3 h-3 ml-auto text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  )}
                </div>
              );
            })}
          </div>

          {/* Secret badges */}
          <p className="text-[9px] text-gray-700 font-medium uppercase tracking-wider mb-2">{_('???', '???')}</p>
          <div className="grid grid-cols-2 gap-3">
            {badges.filter(b => b.id === 'tetris_secret').map(b => {
              const rarityColors: Record<string, string> = {
                rare: 'border-blue-500/30 text-blue-400 bg-blue-500/5',
                extra_rare: 'border-amber-500/30 text-amber-400 bg-amber-500/5',
                ultra_secret: 'border-purple-500/30 text-purple-400 bg-purple-500/5',
                legendary: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5',
                mythic: 'border-red-500/30 text-red-400 bg-red-500/5',
              };
              const iconSvgs: Record<string, string> = {
                triangle: 'M12 2L2 22h20L12 2z',
              };
              return (
                <div key={b.id} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border ${b.unlocked ? rarityColors[b.rarity] || 'border-gray-500/20 text-gray-400' : 'border-drapera-border/30 text-gray-700 opacity-50'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${b.unlocked ? 'bg-gradient-to-br from-blue-500/20 to-transparent' : ''}`}>
                    {!b.unlocked ? (
                      <span className="text-[10px] font-bold text-gray-700">?</span>
                    ) : (
                      <svg className="w-4 h-4 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d={iconSvgs.triangle} />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${b.unlocked ? 'text-white' : 'text-gray-600'}`}>
                      {!b.unlocked ? '???' : b.name}
                    </p>
                    <p className={`text-[8px] uppercase tracking-wider ${b.unlocked ? 'opacity-60 text-purple-400' : 'text-gray-700'}`}>
                      {b.unlocked ? 'Ultra Secret' : '???'}
                    </p>
                    <p className="text-[7px] text-gray-600 leading-tight mt-0.5">{b.unlocked ? b.description || '' : _('Nascosto. Continua ad esplorare...', 'Hidden. Keep exploring...')}</p>
                  </div>
                  {!b.unlocked && (
                    <svg className="w-3 h-3 ml-auto text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}

        {settingsTab === 'account' && (

        <div className="mt-10 premium-card p-5 border border-red-500/20">
          <h2 className="section-title text-red-400 text-lg mb-2">{t('dashboard.danger_zone')}</h2>
          <p className="text-sm text-gray-500 mb-6">{t('dashboard.danger_zone_desc')}</p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-white font-semibold text-sm mb-2">{t('dashboard.delete_account')}</h3>
              <p className="text-xs text-gray-500 mb-4">{t('dashboard.delete_account_desc')}</p>
              <div className="space-y-3">
                <p className="text-xs text-red-400/80 font-medium">{t('dashboard.delete_confirm')}</p>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const confirmInput = form.confirm_text as HTMLInputElement;
                  if (!confirmInput.value || confirmInput.value !== 'DELETE') return;
                  try {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const hdrs: Record<string, string> = {};
                    if (sessionData?.session?.access_token) {
                      hdrs['Authorization'] = `Bearer ${sessionData.session.access_token}`;
                    }
                    const res = await fetch(`${API_BASE}/api/profile/account`, {
                      method: 'DELETE', headers: hdrs,
                    });
                    if (!res.ok) throw new Error(await res.text());
                    setMsg(t('dashboard.account_deleted'));
                    await supabase.auth.signOut();
                    router.push('/');
                  } catch { setMsg(t('dashboard.account_delete_error')); }
                }}>
                  <input
                    name="confirm_text"
                    className="w-full bg-drapera-dark border border-red-500/30 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-red-500/50 transition-colors"
                    placeholder={t('settings.delete_placeholder')}
                  />
                  <button type="submit" className="mt-2 w-full px-4 py-2 bg-red-600/20 border border-red-600/40 text-red-400 text-xs font-medium rounded-lg hover:bg-red-600/30 transition-colors">
                    {t('dashboard.delete_confirm_btn')}
                  </button>
                </form>
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm mb-2">{t('dashboard.legal_links')}</h3>
              <p className="text-xs text-gray-500 mb-4">{t('settings.legal_desc')}</p>
              <div className="space-y-2">
                <Link href="/termini" className="flex items-center gap-2 text-xs text-gray-400 hover:text-drapera-gold transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  {t('dashboard.legal_terms')}
                </Link>
                <Link href="/privacy" className="flex items-center gap-2 text-xs text-gray-400 hover:text-drapera-gold transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  {t('dashboard.legal_privacy')}
                </Link>
                <Link href="/cancellazione-dati" className="flex items-center gap-2 text-xs text-gray-400 hover:text-drapera-gold transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  {t('dashboard.legal_data_deletion')}
                </Link>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
