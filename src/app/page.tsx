'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CardTool from '@/components/CardTool';
import Header from '@/components/Header';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

const API_BASE = '';

function AnimatedCounter({ value, label, color }: { value: number; label: string; color: string }) {
  const [display, setDisplay] = useState(0);
  const isComing = label === 'Coming Soon' || label === 'Preview';
  useEffect(() => {
    if (isComing || value === 0) { setDisplay(0); return; }
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
  }, [value, isComing]);
  return (
    <div className="text-center">
      <p className={`text-3xl font-bold ${isComing ? 'text-gray-600' : color}`}>
        {isComing ? '—' : display.toLocaleString()}
      </p>
      <p className="text-[11px] text-gray-500 mt-1">{label}</p>
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<{ total: number; hpgl: number; iso: number; dxf: number; by_vendor: Record<string, number> } | null>(null);
  const [regState, setRegState] = useState<{ open: boolean; remaining: number; current_users: number; max_users: number } | null>(null);
  const [cadSystems, setCadSystems] = useState<Array<{ id: string; name: string; color?: string; country?: string; training_ready?: boolean }>>([]);
  const [userOffice, setUserOffice] = useState('');
  const [wlEmail, setWlEmail] = useState('');
  const [wlMsg, setWlMsg] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/profile/stats/public`).then(r => r.json()).then(setStats).catch(() => {});
    fetch(`${API_BASE}/api/profile/registration-state`).then(r => r.json()).then(setRegState).catch(() => {});
    fetch(`${API_BASE}/api/profile/cad-systems`).then(r => r.json()).then(d => setCadSystems(d.cad_systems ?? [])).catch(() => {});
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.access_token) {
        fetch(`${API_BASE}/api/profile`, {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        }).then(r => r.json()).then(p => { if (p.office) setUserOffice(p.office); }).catch(() => {});
      }
    });
  }, []);

  const trainedCadCount = cadSystems.filter(c => c.training_ready).length;
  const pendingCadCount = cadSystems.filter(c => !c.training_ready).length;

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

  const coreTools = [
    { title: 'VectorEngine™', description: 'Analizza. Identifica. Comprende. Visualizza.', href: '/tools/hpgl', premium: true, active: true },
    { title: 'VectorEngine ISO', description: 'Analisi di modelli ISO per calzatura.', href: '/tools/iso', comingSoon: true },
    { title: 'VectorEngine DXF', description: 'Analisi DXF per componenti tecnici.', href: '/tools/dxf', comingSoon: true },
  ];

  const isOpen = regState?.open ?? true;
  const remaining = regState?.remaining ?? 0;
  const current = regState?.current_users ?? 0;
  const maxUsers = regState?.max_users ?? 20;
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
                Powered by <strong>Draphera VectorEngine™</strong>
                <a href="#vector-engine" className="ml-1 underline decoration-dotted underline-offset-2 hover:text-cyan-300">Cos'è?</a>
              </span>
            </div>

            <h1 className="section-title text-white mb-6 leading-tight">
              La piattaforma intelligente<br />
              <span className="gradient-text">per la modellistica digitale</span>
            </h1>
            <p className="text-lg md:text-2xl font-bold text-white/90 mb-3 leading-relaxed">
              Il primo sistema che riconosce automaticamente<br className="hidden sm:block" />
              il CAD di origine dei tuoi file.
            </p>
            <p className="section-subtitle mb-6">
              VectorEngine<sup>™</sup> — Analizza. Identifica. Comprende. Visualizza.
            </p>

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
              <Link href="/tools/hpgl" className="btn-gold text-lg px-8 py-4">
                Apri VectorEngine
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              {isOpen ? (
                <Link href="/auth/signup" className="btn-ghost text-lg px-8 py-4">
                  Registrati — {remaining} posti
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
            </div>
            {wlMsg && <p className="text-xs text-drapera-gold mt-3">{wlMsg}</p>}
          </div>

          {stats && (
            <div className="mt-12 space-y-4 max-w-2xl">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <AnimatedCounter value={stats.total} label={t('stats.total')} color="text-drapera-gold" />
                <AnimatedCounter value={stats.hpgl} label="HPGL" color="text-cyan-400" />
                <AnimatedCounter value={stats.iso} label={'Coming Soon'} color="text-green-400" />
                <AnimatedCounter value={stats.dxf} label={'Coming Soon'} color="text-purple-400" />
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

      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-drapera-violet/10 via-drapera-gold/5 to-transparent" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-600 mb-3">Mission</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white font-display leading-tight">
            <span className="text-drapera-gold">Shape Before the File</span>
            <br />
            <span className="text-lg md:text-xl text-gray-400 font-normal mt-2 block">
              Industrial Geometry Intelligence
            </span>
          </h2>
          <p className="text-sm text-gray-500 mt-4 max-w-2xl mx-auto">
            Draphera Hub è il sistema operativo per la geometria industriale.
            I formati sono solo contenitori — l'intelligenza è nella forma.
          </p>
        </div>
      </section>

      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-drapera-violet/5 to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center mb-20">
            <div>
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-drapera-gold to-amber-500 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-drapera-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
              </div>
              <h2 className="text-3xl font-bold text-white font-display mb-4">Accesso Prioritario</h2>
              <p className="text-gray-400 mb-4">
                <span className="text-drapera-gold font-bold">20 posti Founder</span> — i pilastri dell&apos;infrastruttura.
                <br />
                <span className="text-cyan-400 font-bold">30 posti Beta Tester</span> — gli analisti di produzione.
              </p>
              <p className="text-sm text-gray-500">
                Abbiamo limitato l&apos;accesso per garantire la massima integrità della piattaforma.
                La scarsità di posti riflette la necessità di mantenere un feedback loop di alta qualità con i nostri tester.
              </p>
              <div className="mt-6 inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-drapera-gold/5 border border-drapera-gold/15">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-drapera-gold to-amber-500 flex items-center justify-center text-xs font-bold text-drapera-dark shrink-0">
                  F
                </div>
                <div>
                  <p className="text-xs text-white font-semibold">Founder #{current > 0 ? current : '?'}</p>
                  <p className="text-[10px] text-gray-500">Early Access 2026 — Posti limitati</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: stats?.total ?? 0, label: 'File elaborati', color: 'text-drapera-gold' },
                { value: trainedCadCount, label: 'CAD supportati', color: 'text-cyan-400' },
              ].map(s => (
                <div key={s.label} className="premium-card text-center py-6">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
              <div className="premium-card text-center py-5 col-span-2 flex flex-col items-center justify-center">
                <p className="text-lg font-bold text-purple-400">Draphera VectorEngine<sup>™</sup></p>
                <p className="text-[10px] text-gray-500 mt-0.5">Geometric Analysis &amp; Deterministic Voting</p>
              </div>
            </div>
          </div>

          <div id="vector-engine" className="max-w-4xl mx-auto mb-20 scroll-mt-20">
            <div className="premium-card p-8 text-center">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-white font-display mb-2">
                Draphera <span className="text-cyan-400">VectorEngine</span><sup>™</sup>
              </h2>
              <p className="text-sm text-gray-400 mb-6 max-w-xl mx-auto">
                Un motore di analisi geometrica che identifica il CAD di origine, rileva pezzi,
                riconosce intagli, drittofilo e strutture di piazzamento — tutto prima ancora
                di mostrare il file.
              </p>
              <div className="grid sm:grid-cols-4 gap-4 text-center">
                {[
                  { icon: 'M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z', label: 'Analisi', desc: 'Firme vettoriali, pattern penna, strutture CAD' },
                  { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Identifica', desc: 'CAD, formato, famiglia, versione protocollo' },
                  { icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'Comprende', desc: 'Pezzi, intagli, drittofilo, piazzamento, blocchi' },
                  { icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z', label: 'Visualizza', desc: 'Render SVG/PNG, export tecnico, scheda PDF' },
                ].map(item => (
                  <div key={item.label} className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} /></svg>
                    </div>
                    <h3 className="text-sm text-white font-semibold mb-0.5">{item.label}</h3>
                    <p className="text-[10px] text-gray-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto mb-20">
            <h2 className="text-2xl font-bold text-white font-display text-center mb-8">Come funziona</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { step: '1', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', title: 'Carica il file', desc: 'HPGL, PLT, ISO o DXF. Il sistema analizza struttura, comandi e coordinate.' },
                { step: '2', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7', title: 'Analisi vettoriale', desc: 'Firme HPGL, angoli, intagli, pattern penna.' },
                { step: '3', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', title: 'Classificazione', desc: 'Sistema a voti con analisi geometrica e confidence smoothing.' },
                { step: '4', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Report CAD', desc: 'CAD riconosciuto, confidence, feature scores e suggerimenti.' },
              ].map(s => (
                <div key={s.step} className="premium-card text-center py-6 px-4 relative overflow-hidden">
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-drapera-gold/10 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-drapera-gold">{s.step}</span>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-drapera-gold/10 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-drapera-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.icon} /></svg>
                  </div>
                  <h3 className="text-sm text-white font-semibold mb-1">{s.title}</h3>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{s.desc}</p>
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
                  { icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'Vantaggio competitivo', desc: 'I Founder (20) e Beta Tester (30) ricevono badge esclusivi e accesso prioritario.' },
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
            <p className="section-subtitle mx-auto">Strumenti alimentati da Draphera VectorEngine™</p>
          </div>
          <div className="mb-16">
            <h3 className="text-sm font-semibold text-drapera-gold uppercase tracking-wider mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Piattaforma
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {coreTools.map(tool => <CardTool key={tool.href} {...tool} />)}
            </div>
          </div>

          {cadSystems.length > 0 && (
            <div className="mb-16">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="section-title text-white">CAD supportati</h2>
                  <p className="text-xs text-gray-500 mt-1">{trainedCadCount} addestrati · {pendingCadCount} in attesa dataset</p>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-green-400"><span className="w-2 h-2 rounded-full bg-green-400" /> Addestrato</span>
                  <span className="flex items-center gap-1.5 text-gray-500"><span className="w-2 h-2 rounded-full bg-gray-500" /> In attesa dataset</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {cadSystems.map(cad => {
                  const isTrained = cad.training_ready;
                  return (
                    <div key={cad.id}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        isTrained
                          ? 'border-green-500/30 bg-green-500/10 text-green-300'
                          : 'border-gray-600/30 bg-gray-700/30 text-gray-400'
                      }`}
                      title={cad.country ? `Paese: ${cad.country}` : ''}
                    >
                      <span className={`w-2 h-2 rounded-full ${isTrained ? 'bg-green-400' : 'bg-gray-500'}`} />
                      {cad.name}
                      {isTrained && <span className="text-[9px] text-green-400/60">✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto mt-6">
            <Link href="/dashboard/community" className="premium-card p-4 text-center hover:border-drapera-gold/40 transition-colors block">
              <p className="text-lg font-bold text-drapera-gold">Community</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Scopri chi c'è</p>
            </Link>
            <div className="premium-card p-4 text-center">
            <h3 className="text-base font-semibold text-white mb-2">Laboratorio Draphera</h3>
            <p className="text-xs text-gray-500 mb-4">
              Stiamo sviluppando nuovi strumenti. I nostri 50 membri (20 Founder + 30 Beta) guideranno la roadmap.
            </p>
            <Link href="/sondaggio" className="btn-gold text-xs px-4 py-2 inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Suggerisci il prossimo tool
            </Link>
          </div>
        </div>

          <div className="max-w-3xl mx-auto mt-16">
            <div className="premium-card p-6">
              <h2 className="text-lg font-bold text-white font-display mb-4">Linee guida upload</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs text-drapera-gold font-semibold uppercase tracking-wider mb-3">Formati accettati</h3>
                  <ul className="space-y-2 text-xs text-gray-400">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" /> <strong className="text-gray-300">HPGL</strong> — file nativi plotter</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" /> <strong className="text-gray-300">ISO</strong> — codice G per macchine taglio</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" /> <strong className="text-gray-300">DXF</strong> — interscambio CAD</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" /> <strong className="text-gray-300">Altri formati</strong> — in fase di sviluppo</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-3">Cosa NON facciamo</h3>
                  <ul className="space-y-2 text-xs text-gray-400">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" /> Non usiamo i tuoi file per addestrare il modello ML</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" /> Non condividiamo i tuoi file con terze parti</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" /> Non salviamo il contenuto dei file oltre la sessione</li>
                  </ul>
                </div>
                <div className="sm:col-span-2 pt-2 border-t border-drapera-border/40">
                  <h3 className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-3">Come contribuire al training</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Il modello ML viene addestrato esclusivamente su un dataset Draphera verificato manualmente.
                    Puoi contribuire scaricando il tuo file da VectorEngine, verificando il CAD di origine
                    e inviandolo come campione per il training. I file vengono controllati prima di entrare nel dataset.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="px-2 py-1 rounded bg-white/5 font-mono text-[10px]">Dataset: verifica manuale</span>
                    <span className="px-2 py-1 rounded bg-white/5 font-mono text-[10px]">Analisi: vettoriale</span>
                    <span className="px-2 py-1 rounded bg-white/5 font-mono text-[10px]">Engine: Draphera VectorEngine™</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
