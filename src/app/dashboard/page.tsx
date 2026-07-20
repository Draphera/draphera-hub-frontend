'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import CardTool from '@/components/CardTool';
import { useTranslation } from '@/lib/i18n';
import { profileApi, userApi } from '@/lib/api';

const API_BASE = '';
import type { Session } from '@supabase/supabase-js';

const LEVELS = [
  { label: 'novizio', min: 0, icon: '🥚' },
  { label: 'apprendista', min: 10, icon: '🐣' },
  { label: 'professionista', min: 50, icon: '⚙️' },
  { label: 'esperto', min: 100, icon: '🔧' },
  { label: 'maestro', min: 250, icon: '🏆' },
  { label: 'veterano', min: 500, icon: '⭐' },
  { label: 'guru', min: 1000, icon: '👑' },
];

function getLevel(count: number) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) {
    if (count >= l.min) lvl = l;
  }
  return lvl;
}

function getNextLevel(count: number) {
  for (const l of LEVELS) {
    if (count < l.min) return l;
  }
  return null;
}

export default function DashboardPage() {
  const { lang, t } = useTranslation();
  const _ = useCallback((it: string, en: string) => lang === 'en' ? en : it, [lang]);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [uploadCount, setUploadCount] = useState(0);
  const [uploads, setUploads] = useState<Array<Record<string, unknown>>>([]);
  const [showAll, setShowAll] = useState(false);
  const [founder, setFounder] = useState<{ is_founder: boolean; is_beta?: boolean; position?: number; is_admin?: boolean } | null>(null);
  const [badges, setBadges] = useState<string[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (!data.session) { router.push('/auth/signin?redirect=/dashboard'); return; }
      try {
        const results = await Promise.allSettled([
          profileApi.get(),
          userApi.stats(),
          userApi.uploads(showAll ? 999 : 5),
        ]);
        if (results[0].status === 'fulfilled') setProfile(results[0].value);
        if (results[1].status === 'fulfilled') setUploadCount(results[1].value.total_uploads);
        if (results[2].status === 'fulfilled') setUploads(results[2].value.uploads);
      } catch { /* ignore */ }
      try {
        const tok = (await supabase.auth.getSession()).data?.session?.access_token;
        if (tok) {
          const fr = await fetch(`${API_BASE}/api/profile/founder-status`, { headers: { Authorization: `Bearer ${tok}` } });
          if (fr.ok) setFounder(await fr.json());
          const badgeData = await userApi.getBadges();
          setBadges((badgeData.badges || []).filter((b: any) => b.unlocked).map((b: any) => b.id));
        }
      } catch {}
      setLoading(false);
    });
  }, [router, showAll]);

  const allTools = [
    { id: 'hpgl-viewer', title: 'VectorEngine', description: t('home.cta_hpgl'), href: '/tools/hpgl', premium: true, active: true },
    { id: 'iso-viewer', title: 'VectorEngine ISO', description: _('Analisi di modelli ISO per calzatura.', 'ISO pattern analysis for footwear.'), href: '/tools/iso', comingSoon: true },
    { id: 'dxf-viewer', title: 'VectorEngine DXF', description: _('Analisi DXF per componenti tecnici.', 'DXF analysis for technical components.'), href: '/tools/dxf', comingSoon: true },
  ];

  const officeToolIds: Record<string, string[]> = {
    modellistica: ['hpgl-viewer', 'iso-viewer', 'dxf-viewer'],
  };

  const coreIds = ['hpgl-viewer'];
  const labIds = ['iso-viewer', 'dxf-viewer'];
  const userOffice = profile.office || '';
  const officeIds = userOffice ? (officeToolIds[userOffice] || null) : null;
  const tools = officeIds ? allTools.filter(t => officeIds.includes(t.id)) : allTools;
  const coreTools = allTools.filter(t => coreIds.includes(t.id));
  const labTools = allTools.filter(t => labIds.includes(t.id));

  const name = profile.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || '';
  const level = getLevel(uploadCount);
  const nextLevel = getNextLevel(uploadCount);
  const progress = nextLevel && (nextLevel.min - level.min) > 0
    ? ((uploadCount - level.min) / (nextLevel.min - level.min)) * 100
    : 100;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-drapera-gold border-t-transparent rounded-full animate-spin" /></div>;
  if (!session) return null;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-14">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-hero-glow opacity-30" />
          <div className="absolute inset-0 grid-bg opacity-20" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-drapera-gold/20 bg-drapera-gold/5 text-drapera-gold text-xs font-medium mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-drapera-gold animate-pulse-gold" />
                {t('dashboard.subtitle')}
              </div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="section-title text-white leading-tight">
                  {t('dashboard.hero_greeting').replace('{name}', name)}
                </h1>
                {founder?.is_admin && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-lg shadow-amber-500/10">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-400">{_('Admin', 'Admin')}</span>
                  </div>
                )}
                {founder?.is_founder || founder?.is_beta ? (
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border shadow-lg ${founder.position && founder.position <= 10 ? 'bg-amber-500/10 border-amber-500/20 shadow-amber-500/10' : 'bg-cyan-500/10 border-cyan-500/20 shadow-cyan-500/10'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${founder.position && founder.position <= 10 ? 'bg-gradient-to-br from-amber-400 to-yellow-600' : 'bg-gradient-to-br from-cyan-400 to-blue-600'}`}>
                      {founder.position && founder.position <= 10 ? (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                      ) : (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold ${founder.position && founder.position <= 10 ? 'text-amber-400' : 'text-cyan-400'}`}>#{founder.position} {founder.position && founder.position <= 10 ? _('Founder', 'Founder') : _('Beta', 'Beta')}</span>
                  </div>
                ) : null}
                {badges.includes('custode') && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 shadow-lg shadow-red-500/10">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
                    </div>
                    <span className="text-[10px] font-semibold text-red-400">{_('Custode', 'Custodian')}</span>
                  </div>
                )}
                {badges.includes('tetris_secret') && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 shadow-lg shadow-purple-500/10">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 22h20L12 2z" /></svg>
                    </div>
                    <span className="text-[10px] font-semibold text-purple-400">{_('Tetris', 'Tetris')}</span>
                  </div>
                )}
              </div>
              <p className="section-subtitle max-w-xl">{t('dashboard.hero_desc')}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10">
              <div className="premium-card p-4 text-center">
                <p className="text-2xl font-bold text-drapera-gold">1</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{_('Strumento attivo', 'Active tool')}</p>
              </div>
              <div className="premium-card p-4 text-center">
                <p className="text-2xl font-bold text-white">2</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{_('In laboratorio', 'In lab')}</p>
              </div>
              <Link href="/dashboard/community" className="premium-card p-4 text-center block hover:border-drapera-gold/40 transition-colors">
                <p className="text-2xl font-bold text-drapera-gold">{_('Community', 'Community')}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{_('Scopri chi c\'è', 'Discover who is here')}</p>
              </Link>
              <div className="premium-card p-4 text-center">
                <p className="text-2xl font-bold text-drapera-gold">{uploadCount}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{t('dashboard.files_uploaded')}</p>
              </div>
              <div className="premium-card p-4 text-center">
                <Link href="/tools/hpgl" className="btn-gold text-xs px-3 py-2 w-full inline-flex items-center justify-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  {t('dashboard.open_hpgl')}
                </Link>
              </div>
            </div>

            {founder?.is_beta && !founder?.is_founder && (
              <div className="premium-card p-4 mt-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-semibold">{_('Candidati come Founder', 'Apply as Founder')}</p>
                  {uploadCount >= 50 ? (
                    <p className="text-[10px] text-gray-500 mt-0.5">{_('Raccontaci il tuo background per la candidatura', 'Tell us about your background to apply')}</p>
                  ) : (
                    <p className="text-[10px] text-gray-500 mt-0.5">{_('Carica 50 file unici per sbloccare la candidatura', 'Upload 50 unique files to unlock the application')}</p>
                  )}
                </div>
                <Link href={uploadCount >= 50 ? '/beta' : '/dashboard/settings'} className="text-xs px-3 py-1.5 rounded-lg bg-drapera-gold/10 text-drapera-gold border border-drapera-gold/20 hover:bg-drapera-gold/20 transition-colors whitespace-nowrap">
                  {uploadCount >= 50 ? _('Candidati ora', 'Apply now') : _('Vai a Impostazioni', 'Go to Settings')} →
                </Link>
              </div>
            )}

            <div className="premium-card p-5 mt-6 flex items-center gap-5">
              <div className="text-3xl">{level.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-sm text-white font-semibold">{t('dashboard.level')}: {t(`level.${level.label}`)}</p>
                  <span className="text-xs text-drapera-gold font-medium">{uploadCount} {t('dashboard.files_uploaded')}</span>
                </div>
                {nextLevel && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                      <span>{t(`level.${level.label}`)}</span>
                      <span>{nextLevel.min - uploadCount} {t('dashboard.uploads_needed')} → {t(`level.${nextLevel.label}`)}</span>
                    </div>
                    <div className="h-1.5 bg-drapera-border/30 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-drapera-gold to-amber-500 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                  </div>
                )}
                {!nextLevel && (
                  <p className="text-xs text-drapera-gold mt-1">{_('Massimo livello raggiunto!', 'Maximum level reached!')}</p>
                )}
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-drapera-gold/20 to-transparent" />
        </section>

        {msg && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
            <div className="px-4 py-2 rounded-lg bg-drapera-gold/10 border border-drapera-gold/20 text-xs text-drapera-gold">
              {msg}
            </div>
          </div>
        )}

        {uploads.length > 0 && (
          <section className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title text-white text-lg">{t('dashboard.history')}</h2>
                {uploads.length >= 5 && !showAll && (
                  <button onClick={() => setShowAll(true)} className="text-xs text-drapera-gold hover:underline">{t('dashboard.load_more')}</button>
                )}
              </div>
              <div className="premium-card divide-y divide-drapera-border/30">
                {uploads.slice(0, showAll ? undefined : 5).map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">{u.filename}</p>
                      <p className="text-[11px] text-gray-500">{u.file_size ? `${(u.file_size / 1024).toFixed(1)} KB` : ''}{u.created_at ? ` · ${new Date(u.created_at).toLocaleDateString()}` : ''}</p>
                    </div>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-drapera-gold/10 text-drapera-gold font-medium">{u.file_type}</span>
                  </div>
                ))}
                {uploads.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">{t('dashboard.no_uploads')}</div>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="section-title text-white text-xl">VectorEngine<sup>™</sup></h2>
                <p className="text-sm text-drapera-steel-light mt-1">{_('Analisi geometrica per file HPGL', 'Geometric analysis for HPGL files')}</p>
              </div>
              <Link href="/tools/hpgl" className="btn-gold text-xs px-4 py-2 hidden sm:inline-flex">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                {t('dashboard.open_hpgl')}
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {coreTools.map(tool => <CardTool key={tool.href} {...tool} changelog={tool.href === '/tools/hpgl' ? '/changelog' : undefined} />)}
            </div>

            {labTools.filter(t => tools.includes(t)).length > 0 && (
              <div className="mt-12">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="section-title text-white text-base">{_('Laboratorio', 'Lab')}</h2>
                  <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">{_('Ricerca', 'Research')}</span>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  {_('Estensioni future del motore VISION ad altri formati CAD.', 'Future extensions of the VISION engine to other CAD formats.')}
                </p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {labTools.filter(t => tools.includes(t)).map(tool => <CardTool key={tool.href} {...tool} />)}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Social follow modal (one-time) */}
        {typeof window !== 'undefined' && !localStorage.getItem('draphera-social-shown') && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-drapera-dark border border-drapera-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-white font-bold text-base mb-1">{_('Benvenuto in Draphera!', 'Welcome to Draphera!')}</h3>
              <p className="text-gray-500 text-xs mb-5">
                {_('Seguici sui social per non perdere novità, aggiornamenti e anticipazioni su VectorEngine.', 'Follow us on social media to stay updated on VectorEngine news and updates.')}
              </p>
              <div className="flex flex-col gap-2">
                <a href="https://linkedin.com/company/draphera" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 text-sm font-semibold hover:bg-blue-600/30 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  {_('LinkedIn', 'LinkedIn')}
                </a>
                <a href="https://instagram.com/draphera" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-pink-600/20 text-pink-400 border border-pink-500/30 text-sm font-semibold hover:bg-pink-600/30 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  {_('Instagram', 'Instagram')}
                </a>
              </div>
              <button onClick={() => { localStorage.setItem('draphera-social-shown', '1'); setMsg(''); }}
                className="mt-4 text-xs text-gray-600 hover:text-white transition-colors">
                {_('Ricorda dopo', 'Remind me later')}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
