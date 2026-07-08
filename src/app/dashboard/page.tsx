'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import CardTool from '@/components/CardTool';
import { useTranslation } from '@/lib/i18n';
import { profileApi } from '@/lib/api';
import type { Session } from '@supabase/supabase-js';

export default function DashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (!data.session) { router.push('/auth/signin?redirect=/dashboard'); return; }
      try {
        const p = await profileApi.get();
        setProfile(p);
      } catch { /* ignore */ }
      setLoading(false);
    });
  }, [router]);

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
                <p className="text-2xl font-bold text-white">
                  <svg className="w-5 h-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">HPGL</p>
              </div>
              <div className="premium-card p-4 text-center sm:hidden lg:block">
                <Link href="/tools/hpgl" className="btn-gold text-xs px-4 py-2 w-full">{t('dashboard.open_hpgl')}</Link>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-drapera-gold/20 to-transparent" />
        </section>

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
