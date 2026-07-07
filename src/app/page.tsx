'use client';

import Link from 'next/link';
import CardTool from '@/components/CardTool';
import Header from '@/components/Header';
import { useTranslation } from '@/lib/i18n';

const outlineIcons = [
  'M12 6v6m0 0v6m0-6h6m-6 0H6',
  'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7',
];

export default function HomePage() {
  const { t } = useTranslation();

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
        {outlineIcons.map((d, i) => (
          <svg key={i} className={`absolute wireframe-decoration ${i === 0 ? 'top-20 left-10 w-32 h-32' : i === 1 ? 'bottom-20 right-10 w-40 h-40' : 'top-1/2 right-1/4 w-24 h-24'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.6}>
            <path d={d} />
          </svg>
        ))}
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
