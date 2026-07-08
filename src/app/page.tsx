'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CardTool from '@/components/CardTool';
import Header from '@/components/Header';
import { useTranslation } from '@/lib/i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

function AnimatedCounter({ value, label, color }: { value: number; label: string; color: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 1200;
    const start = performance.now();
    const raf = () => {
      const elapsed = performance.now() - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * value));
      if (progress < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [value]);
  return (
    <div className="text-center">
      <p className={`text-3xl font-bold ${color}`}>{display.toLocaleString()}</p>
      <p className="text-[11px] text-gray-500 mt-1">{label}</p>
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<{ total: number; hpgl: number; iso: number; dxf: number; by_vendor: Record<string, number> } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/profile/stats/public`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

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

  return (
    <div className="relative">
      <Header />
      <section className="relative min-h-[85vh] flex items-center overflow-hidden pt-14">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-drapera-gold/20 bg-drapera-gold/5 text-drapera-gold text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-drapera-gold animate-pulse-gold" />
              {t('home.hero_badge')}
            </div>
            <h1 className="section-title text-white mb-6 leading-tight">
              {t('home.title1')}{' '}
              <span className="gradient-text">{t('home.title2')}</span>
              <br />
              {t('home.title3')}
            </h1>
            <p className="section-subtitle mb-10">{t('home.subtitle')}</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/tools/hpgl" className="btn-gold text-lg px-8 py-4">
                {t('home.cta_hpgl')}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
              <Link href="/dashboard" className="btn-ghost text-lg px-8 py-4">{t('home.cta_discover')}</Link>
            </div>
          </div>
          {stats && (
            <div className="mt-12 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl">
                <AnimatedCounter value={stats.total} label={t('stats.total')} color="text-drapera-gold" />
                <AnimatedCounter value={stats.hpgl} label="HPGL" color="text-cyan-400" />
                <AnimatedCounter value={stats.iso} label="ISO" color="text-green-400" />
                <AnimatedCounter value={stats.dxf} label="DXF" color="text-purple-400" />
              </div>
              {Object.keys(stats.by_vendor).length > 0 && (
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
                  {Object.entries(stats.by_vendor).map(([vendor, count], i) => {
                    const colors = ['text-drapera-gold', 'text-cyan-400', 'text-green-400', 'text-purple-400', 'text-pink-400', 'text-orange-400', 'text-blue-400', 'text-teal-400'];
                    return (
                      <div key={vendor} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{vendor}:</span>
                        <span className={`text-sm font-bold ${colors[i % colors.length]}`}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-drapera-gold/20 to-transparent" />
      </section>

      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-drapera-violet/5 to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-title text-white mb-4">{t('home.section_title')}</h2>
            <p className="section-subtitle mx-auto">{t('home.section_sub')}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tools.map(tool => <CardTool key={tool.href} {...tool} />)}
          </div>
        </div>
      </section>
    </div>
  );
}
