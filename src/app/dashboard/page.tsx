'use client';

import { useEffect, useState } from 'react';
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
  const { t } = useTranslation();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [uploadCount, setUploadCount] = useState(0);
  const [uploads, setUploads] = useState<Array<Record<string, unknown>>>([]);
  const [showAll, setShowAll] = useState(false);
  const [founder, setFounder] = useState<{ is_founder: boolean; position?: number } | null>(null);
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
        }
      } catch {}
      setLoading(false);
    });
  }, [router, showAll]);

  const allTools = [
    { id: 'hpgl-viewer', title: 'VectorEngine', description: t('home.cta_hpgl'), href: '/tools/hpgl', premium: true, active: true },
    { id: 'iso-viewer', title: 'VectorEngine ISO', description: 'Analisi di modelli ISO per calzatura.', href: '/tools/iso', comingSoon: true },
    { id: 'dxf-viewer', title: 'VectorEngine DXF', description: 'Analisi DXF per componenti tecnici.', href: '/tools/dxf', comingSoon: true },
    { id: 'techsheet', title: 'TechSheet Light', description: 'Genera schede tecniche ZIP.', href: '/tools/techsheet-light', premium: true, comingSoon: true },
    { id: 'material', title: 'Material Normalizer', description: 'Normalizza descrizioni materiali ERP.', href: '/tools/material-normalizer', comingSoon: true },
    { id: 'accessory', title: 'Accessory Normalizer', description: 'Standardizza nomenclature accessori.', href: '/tools/accessory-normalizer', comingSoon: true },
    { id: 'bom', title: 'BOM Generator', description: 'Genera distinte base.', href: '/tools/bom-generator', comingSoon: true },
    { id: 'quality', title: 'Checklist Qualità', description: 'Checklist per controlli qualità.', href: '/tools/checklist-qualita', comingSoon: true },
    { id: 'labels', title: 'Generatore Etichette', description: 'Crea etichette prodotto in batch.', href: '/tools/generatore-etichette', comingSoon: true },
  ];

  const officeToolIds: Record<string, string[]> = {
    modellistica: ['hpgl-viewer', 'iso-viewer', 'dxf-viewer'],
    produzione: ['bom', 'quality', 'accessory'],
  };

  const coreIds = ['hpgl-viewer', 'iso-viewer', 'dxf-viewer'];
  const userOffice = profile.office || '';
  const officeIds = userOffice ? (officeToolIds[userOffice] || null) : null;
  const tools = officeIds ? allTools.filter(t => officeIds.includes(t.id)) : allTools;
  const coreTools = allTools.filter(t => coreIds.includes(t.id));
  const labTools = allTools.filter(t => !coreIds.includes(t.id));

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
                {founder?.is_founder && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-drapera-gold/20 to-amber-500/10 border border-drapera-gold/30 shadow-gold-glow">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-drapera-gold to-amber-500 flex items-center justify-center text-[8px] font-bold text-drapera-dark shrink-0">F</div>
                    <span className="text-[10px] font-bold text-drapera-gold">#{founder.position}</span>
                  </div>
                )}
              </div>
              <p className="section-subtitle max-w-xl">{t('dashboard.hero_desc')}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10">
              <div className="premium-card p-4 text-center">
                <p className="text-2xl font-bold text-drapera-gold">1</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{t('dashboard.active_tools_count')}</p>
              </div>
              <div className="premium-card p-4 text-center">
                <p className="text-2xl font-bold text-white">8</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{t('dashboard.dev_count')}</p>
              </div>
              <Link href="/dashboard/community" className="premium-card p-4 text-center block hover:border-drapera-gold/40 transition-colors">
                <p className="text-2xl font-bold text-drapera-gold">Community</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Scopri chi c'è</p>
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
                  <p className="text-xs text-drapera-gold mt-1">Massimo livello raggiunto!</p>
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
                <h2 className="section-title text-white text-xl">Modellistica &amp; CAD</h2>
                <p className="text-sm text-drapera-steel-light mt-1">Visualizzatori e riconoscimento intelligente.</p>
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
                  <h2 className="section-title text-white text-base">Laboratorio Draphera</h2>
                  <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Beta</span>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Strumenti in fase di sviluppo. Partecipa ai sondaggi per aiutarci a prioritizzare.
                </p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {labTools.filter(t => tools.includes(t)).map(tool => <CardTool key={tool.href} {...tool} />)}
                </div>
                <div className="mt-6 premium-card p-5 text-center">
                  <p className="text-sm text-white font-medium mb-2">Cosa vorresti vedere in Draphera Hub?</p>
                  <p className="text-xs text-gray-500 mb-4">I nostri 50 membri (20 Founder + 30 Beta) guideranno la roadmap del prodotto.</p>
                  <Link href="/sondaggio" className="btn-gold text-xs px-4 py-2 inline-flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    Partecipa al sondaggio
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
