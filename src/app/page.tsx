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
  const [regState, setRegState] = useState<{ open: boolean; remaining: number; current_users: number; max_users: number } | null>(null);
  const [wlEmail, setWlEmail] = useState('');
  const [wlMsg, setWlMsg] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/profile/stats/public`).then(r => r.json()).then(setStats).catch(() => {});
    fetch(`${API_BASE}/api/profile/registration-state`).then(r => r.json()).then(setRegState).catch(() => {});
  }, []);

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setWlMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/profile/waitlist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: wlEmail }),
      });
      const data = await res.json();
      if (data.status === 'can_register') setWlMsg('Puoi registrarti ora!');
      else setWlMsg(`Sei in coda! Posizione: #${data.position || 0}`);
    } catch { setWlMsg('Errore. Riprova.'); }
  };

  const officeTools: Record<string, { title: string; desc: string; href: string; premium?: boolean; active?: boolean; comingSoon?: boolean }[]> = {
    'Ufficio Stile': [
      { title: 'TechSheet Light', desc: 'Genera schede tecniche ZIP.', href: '/tools/techsheet-light', premium: true, comingSoon: true },
      { title: 'Generatore Etichette', desc: 'Crea etichette prodotto in batch.', href: '/tools/generatore-etichette', comingSoon: true },
      { title: 'Material Normalizer', desc: 'Normalizza descrizioni materiali ERP.', href: '/tools/material-normalizer', comingSoon: true },
    ],
    Modellistica: [
      { title: 'HPGL Viewer', desc: t('home.cta_hpgl'), href: '/tools/hpgl', premium: true, active: true },
      { title: 'ISO Viewer', desc: 'Anteprima e analisi di modelli ISO.', href: '/tools/iso', comingSoon: true },
      { title: 'DXF Viewer', desc: 'Visualizzatore DXF per componenti tecnici.', href: '/tools/dxf', comingSoon: true },
    ],
    CAD: [
      { title: 'HPGL Viewer', desc: t('home.cta_hpgl'), href: '/tools/hpgl', premium: true, active: true },
      { title: 'ISO Viewer', desc: 'Anteprima e analisi di modelli ISO.', href: '/tools/iso', comingSoon: true },
      { title: 'DXF Viewer', desc: 'Visualizzatore DXF per componenti tecnici.', href: '/tools/dxf', comingSoon: true },
    ],
    Produzione: [
      { title: 'BOM Generator', desc: 'Genera distinte base.', href: '/tools/bom-generator', comingSoon: true },
      { title: 'Checklist Qualità', desc: 'Checklist per controlli qualità.', href: '/tools/checklist-qualita', comingSoon: true },
      { title: 'Accessory Normalizer', desc: 'Standardizza nomenclature accessori.', href: '/tools/accessory-normalizer', comingSoon: true },
    ],
    Prototipia: [
      { title: 'TechSheet Light', desc: 'Genera schede tecniche ZIP.', href: '/tools/techsheet-light', premium: true, comingSoon: true },
      { title: 'Material Normalizer', desc: 'Normalizza descrizioni materiali ERP.', href: '/tools/material-normalizer', comingSoon: true },
    ],
  };

  const isOpen = regState?.open ?? true;
  const remaining = regState?.remaining ?? 0;
  const current = regState?.current_users ?? 0;
  const maxUsers = regState?.max_users ?? 100;
  const totalVendors = stats ? Object.keys(stats.by_vendor).length : 0;

  return (
    <div className="relative">
      <Header />
      <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-14">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-drapera-gold/20 bg-drapera-gold/5 text-drapera-gold text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-drapera-gold animate-pulse-gold" />
                Early Access — {isOpen ? `${remaining} posti disponibili` : 'Completato'}
              </span>
              <span className="px-3 py-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-xs font-medium">
                ML CAD Recognition v1.0
              </span>
            </div>

            <h1 className="section-title text-white mb-6 leading-tight">
              {t('home.title1')}{' '}
              <span className="gradient-text">{t('home.title2')}</span>
              <br />
              {t('home.title3')}
            </h1>
            <p className="section-subtitle mb-6">{t('home.subtitle')}</p>

            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-white/5 border border-drapera-border mb-8">
              <span className="text-xs text-gray-500">Utenti attivi:</span>
              <span className="text-sm font-bold text-drapera-gold">{current}</span>
              <span className="text-xs text-gray-600">/</span>
              <span className="text-sm text-gray-400">{maxUsers}</span>
              <div className="w-32 h-1.5 rounded-full bg-drapera-border overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-drapera-gold to-amber-400 transition-all duration-500" style={{ width: `${Math.min(100, (current / maxUsers) * 100)}%` }} />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              {isOpen ? (
                <Link href="/auth/signup" className="btn-gold text-lg px-8 py-4">
                  Registrati ora — {remaining} posti
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </Link>
              ) : (
                <form onSubmit={handleWaitlist} className="flex flex-wrap items-end gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Registrazione chiusa — entra in waitlist</p>
                    <input type="email" value={wlEmail} onChange={e => setWlEmail(e.target.value)} placeholder="La tua email"
                      className="w-64 bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-drapera-gold/50" required />
                  </div>
                  <button type="submit" className="btn-gold text-sm px-6 py-2.5">Entra in waitlist</button>
                </form>
              )}
              <Link href="/tools/hpgl" className="btn-ghost text-lg px-8 py-4">
                {t('home.cta_hpgl')}
              </Link>
            </div>
            {wlMsg && <p className="text-xs text-drapera-gold mt-3">{wlMsg}</p>}
          </div>

          {stats && (
            <div className="mt-12 space-y-4 max-w-2xl">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <AnimatedCounter value={stats.total} label={t('stats.total')} color="text-drapera-gold" />
                <AnimatedCounter value={stats.hpgl} label="HPGL" color="text-cyan-400" />
                <AnimatedCounter value={stats.iso} label="ISO" color="text-green-400" />
                <AnimatedCounter value={stats.dxf} label="DXF" color="text-purple-400" />
              </div>
              {totalVendors > 0 && (
                <div className="flex flex-wrap gap-x-6 gap-y-2">
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
          <div className="grid md:grid-cols-2 gap-8 items-center mb-20">
            <div>
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-drapera-gold to-amber-500 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-drapera-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
              </div>
              <h2 className="text-3xl font-bold text-white font-display mb-4">Founder Badge</h2>
              <p className="text-gray-400 mb-4">
                I primi <span className="text-drapera-gold font-bold">100 utenti</span> riceveranno il badge <span className="text-white font-semibold">Founder</span> permanente.
              </p>
              <p className="text-sm text-gray-500">
                Un riconoscimento esclusivo per chi ha contribuito alla fase iniziale di Draphera Hub.
                Il badge sarà visibile sul profilo e nelle comunicazioni della piattaforma.
              </p>
              <div className="mt-6 inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-drapera-gold/5 border border-drapera-gold/15">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-drapera-gold to-amber-500 flex items-center justify-center text-xs font-bold text-drapera-dark shrink-0">
                  F
                </div>
                <div>
                  <p className="text-xs text-white font-semibold">Founder #{current > 0 ? current : '?'}</p>
                  <p className="text-[10px] text-gray-500">Early Access 2026</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: stats?.total ?? 0, label: 'File elaborati', color: 'text-drapera-gold' },
                { value: totalVendors, label: 'CAD supportati', color: 'text-cyan-400' },
                { value: '20', label: 'Feature ML', color: 'text-green-400' },
                { value: 'RandomForest', label: 'Modello', color: 'text-purple-400', small: true },
              ].map(s => (
                <div key={s.label} className="premium-card text-center py-6">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{s.label}</p>
                  {s.small && <p className="text-[9px] text-gray-600 mt-0.5">+ Rule-based Voting</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-3xl mx-auto mb-20">
            <div className="premium-card text-center">
              <h2 className="text-2xl font-bold text-white font-display mb-4">Perché Early Access?</h2>
              <p className="text-sm text-gray-400 mb-6 max-w-xl mx-auto">
                Draphera Hub è il primo sistema intelligente per il riconoscimento e l&apos;analisi di file CAD nel settore moda.
                Stiamo costruendo questa piattaforma con i feedback dei professionisti del settore.
              </p>
              <div className="grid sm:grid-cols-3 gap-4 text-left">
                {[
                  { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'Qualità garantita', desc: 'Limitiamo l\'accesso per garantire stabilità e supporto ai primi utenti.' },
                  { icon: 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z', label: 'Feedback diretto', desc: 'Ogni utente Early Access contribuisce a migliorare il riconoscimento CAD e le feature della piattaforma.' },
                  { icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'Vantaggio competitivo', desc: 'I primi 100 ricevono il badge Founder e accesso prioritario alle nuove funzionalità.' },
                ].map(item => (
                  <div key={item.label} className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-drapera-gold/10 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-drapera-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} /></svg>
                    </div>
                    <h3 className="text-sm text-white font-semibold mb-1">{item.label}</h3>
                    <p className="text-[11px] text-gray-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center mb-16">
            <h2 className="section-title text-white mb-4">{t('home.section_title')}</h2>
            <p className="section-subtitle mx-auto">{t('home.section_sub')}</p>
          </div>
          {Object.entries(officeTools).map(([office, ts]) => (
            <div key={office} className="mb-10">
              <h3 className="text-sm font-semibold text-drapera-gold uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
                {office}
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {ts.map(tool => <CardTool key={tool.href} title={tool.title} description={tool.desc} href={tool.href} premium={tool.premium} active={tool.active} comingSoon={tool.comingSoon} />)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
