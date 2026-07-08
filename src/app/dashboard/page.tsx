'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import CardTool from '@/components/CardTool';
import { useTranslation } from '@/lib/i18n';
import { profileApi, userApi } from '@/lib/api';
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

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (!data.session) { router.push('/auth/signin?redirect=/dashboard'); return; }
      try {
        const [p, s, u] = await Promise.all([
          profileApi.get(),
          userApi.stats(),
          userApi.uploads(showAll ? 999 : 5),
        ]);
        setProfile(p);
        setUploadCount(s.total_uploads);
        setUploads(u.uploads);
      } catch { /* ignore */ }
      setLoading(false);
    });
  }, [router, showAll]);

  const tools = [
    { title: 'HPGL Viewer', description: t('home.cta_hpgl'), href: '/tools/hpgl', premium: true, active: true },
    { title: 'ISO Viewer', description: 'Anteprima e analisi di modelli ISO.', href: '/tools/iso', comingSoon: true },
    { title: 'DXF Viewer', description: 'Visualizzatore DXF per componenti tecnici.', href: '/tools/dxf', comingSoon: true },
    { title: 'TechSheet Light', description: 'Genera schede tecniche ZIP.', href: '/tools/techsheet-light', premium: true, comingSoon: true },
    { title: 'Material Normalizer', description: 'Normalizza descrizioni materiali ERP.', href: '/tools/material-normalizer', comingSoon: true },
    { title: 'Accessory Normalizer', description: 'Standardizza nomenclature accessori.', href: '/tools/accessory-normalizer', comingSoon: true },
    { title: 'BOM Generator', description: 'Genera distinte base.', href: '/tools/bom-generator', comingSoon: true },
    { title: 'Checklist Qualità', description: 'Checklist per controlli qualità.', href: '/tools/checklist-qualita', comingSoon: true },
    { title: 'Generatore Etichette', description: 'Crea etichette prodotto in batch.', href: '/tools/generatore-etichette', comingSoon: true },
  ];

  const name = profile.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || '';
  const level = getLevel(uploadCount);
  const nextLevel = getNextLevel(uploadCount);
  const progress = nextLevel ? ((uploadCount - level.min) / (nextLevel.min - level.min)) * 100 : 100;

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
              <h1 className="section-title text-white mb-4 leading-tight">
                {t('dashboard.hero_greeting').replace('{name}', name)}
              </h1>
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
                      <p className="text-[11px] text-gray-500">{u.file_size ? `${(u.file_size / 1024).toFixed(1)} KB` : ''} · {u.created_at ? new Date(u.created_at).toLocaleDateString() : ''}</p>
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
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="section-title text-white text-2xl">{t('dashboard.all_tools')}</h2>
                <p className="text-sm text-drapera-steel-light mt-1">{t('dashboard.quick_start')}</p>
              </div>
              <Link href="/tools/hpgl" className="btn-gold text-xs px-4 py-2 hidden sm:inline-flex">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                {t('dashboard.open_hpgl')}
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tools.map(tool => <CardTool key={tool.href} {...tool} />)}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
