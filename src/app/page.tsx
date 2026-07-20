'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import viewerScreenshot from '../../assets/ve-hpgl.png';

const API_BASE = '';

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
  const { lang, t } = useTranslation();
  const _ = useCallback((it: string, en: string) => lang === 'en' ? en : it, [lang]);
  const [stats, setStats] = useState<{ total: number; hpgl: number; iso: number; dxf: number; by_vendor: Record<string, number> } | null>(null);
  const [regState, setRegState] = useState<{ open: boolean; remaining: number; current_users: number; max_users: number } | null>(null);
  const [cadSystems, setCadSystems] = useState<Array<{ id: string; name: string; color?: string; country?: string; training_ready?: boolean; status?: string }>>([]);
  const [wlEmail, setWlEmail] = useState('');
  const [wlMsg, setWlMsg] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/profile/stats/public`).then(r => r.json()).then(setStats).catch(() => {});
    fetch(`${API_BASE}/api/profile/registration-state`).then(r => r.json()).then(setRegState).catch(() => {});
    fetch(`${API_BASE}/api/profile/cad-systems`).then(r => r.json()).then(d => setCadSystems(d.cad_systems ?? [])).catch(() => {});
  }, []);

  const trainedCadCount = cadSystems.filter(c => c.training_ready).length;
  const pendingCadCount = cadSystems.filter(c => !c.training_ready && c.status !== 'research').length;
  const researchCadCount = cadSystems.filter(c => c.status === 'research').length;
  const totalVendors = stats ? Object.keys(stats.by_vendor).length : 0;

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setWlMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/profile/waitlist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: wlEmail }),
      });
      const data = await res.json();
      if (data.status === 'can_register') setWlMsg(_('Puoi registrarti ora!', 'You can register now!'));
      else setWlMsg(_('Sei in coda!', 'You are in queue!') + ` #${data.position || 0}`);
    } catch { setWlMsg(_('Errore. Riprova.', 'Error. Try again.')); }
  };

  const isOpen = regState?.open ?? true;
  const current = regState?.current_users ?? 0;
  const maxUsers = regState?.max_users ?? 20;

  return (
    <div className="relative">
      <Header />

      {/* ─── HERO ─── */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden pt-14">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-drapera-gold/20 bg-drapera-gold/5 text-drapera-gold text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-drapera-gold animate-pulse-gold" />
                {t('home.hero_badge')}
              </span>
              <span className="px-3 py-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-xs font-medium">
                {_('Alimentato da', 'Powered by')} <strong>VISION</strong>
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-display leading-tight mb-6" dangerouslySetInnerHTML={{ __html: t('home.hero_title') }} />

            <p className="text-lg md:text-xl text-gray-300 font-medium mb-4 leading-relaxed max-w-3xl">
              {t('home.hero_subtitle')}
            </p>

            <p className="text-sm text-gray-500 font-mono mb-8">
              {t('home.hero_tagline')}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/tools/hpgl" className="btn-gold text-lg px-8 py-4">
                {t('home.cta_hpgl')}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              {isOpen ? (
                <Link href="/auth/signup" className="btn-ghost text-lg px-8 py-4">
                  {t('home.cta_early_access')}
                </Link>
              ) : (
                <form onSubmit={handleWaitlist} className="flex flex-wrap items-end gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('home.registration_closed')}</p>
                    <input type="email" value={wlEmail} onChange={e => setWlEmail(e.target.value)} placeholder={t('home.email_placeholder')}
                      className="w-64 bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-drapera-gold/50" required />
                  </div>
                  <button type="submit" className="btn-gold text-sm px-6 py-2.5">{t('home.join_waitlist')}</button>
                </form>
              )}
            </div>
            {wlMsg && <p className="text-xs text-drapera-gold mt-3">{wlMsg}</p>}

            {/* Stats */}
            {stats && (
              <div className="mt-12 space-y-4 max-w-2xl">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <AnimatedCounter value={stats.total} label={t('home.stats_files')} color="text-drapera-gold" />
                  <AnimatedCounter value={stats.hpgl} label={_('File HPGL', 'HPGL files')} color="text-cyan-400" />
                  <AnimatedCounter value={trainedCadCount} label={t('home.stats_cad')} color="text-green-400" />
                  <div className="text-center">
                    <p className="text-3xl font-bold text-purple-400">v1.2</p>
                    <p className="text-[11px] text-gray-500 mt-1">{t('home.stats_engine')}</p>
                  </div>
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
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-drapera-gold/20 to-transparent" />
      </section>

      {/* ─── SHAPE BEFORE THE FILE ─── */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-drapera-violet/10 via-drapera-gold/5 to-transparent" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white font-display leading-tight mb-3">
            <span className="text-drapera-gold">{t('home.shape_before_file_title')}</span>
          </h2>
          <p className="text-lg md:text-xl text-cyan-400 font-medium mb-6">
            {t('home.shape_before_file_sub')}
          </p>
          <p className="text-sm text-gray-400 max-w-2xl mx-auto leading-relaxed">
            {t('home.shape_before_file_desc')}
          </p>
        </div>
      </section>

      {/* ─── WORKFLOW ─── */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-drapera-violet/5 to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-2xl font-bold text-white font-display text-center mb-8">{t('home.workflow_title')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', title: 'home.workflow_1_title', desc: 'home.workflow_1_desc' },
                { icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7', title: 'home.workflow_2_title', desc: 'home.workflow_2_desc' },
                { icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', title: 'home.workflow_3_title', desc: 'home.workflow_3_desc' },
                { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', title: 'home.workflow_4_title', desc: 'home.workflow_4_desc' },
              ].map(s => (
                <div key={s.title} className="premium-card text-center py-6 px-4 relative overflow-hidden">
                  <div className="w-10 h-10 rounded-lg bg-drapera-gold/10 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-drapera-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.icon} /></svg>
                  </div>
                  <h3 className="text-sm text-white font-semibold mb-1">{t(s.title)}</h3>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{t(s.desc)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── VECTORENGINE EVIDENCE ─── */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-l from-cyan-500/5 via-transparent to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-sm text-cyan-400 font-medium">VectorEngine<sup>™</sup> · {_('Alimentato da', 'Powered by')} VISION</p>
              </div>
              <h2 className="text-3xl font-bold text-white font-display mb-4">{t('home.evidence_title')}</h2>
              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                {t('home.evidence_desc')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: _('Formato', 'Format'), value: 'HPGL/1 · HPGL/2' },
                  { label: _('Origine CAD', 'CAD origin'), value: _('4 origini riconosciute', '4 recognized origins') },
                  { label: _('Confidenza', 'Confidence'), value: _('Alta · Media · Bassa', 'High · Medium · Low') },
                  { label: _('Analisi', 'Analysis'), value: _('Pezzi · Intagli · Fibra', 'Pieces · Notches · Grainline') },
                ].map(item => (
                  <div key={item.label} className="py-2.5 px-3 rounded-lg bg-white/5 border border-drapera-border/30">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">{item.label}</p>
                    <p className="text-xs text-white font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Viewer screenshot */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-cyan-500/10 via-transparent to-drapera-gold/10 rounded-3xl blur-2xl" />
              <div className="relative rounded-xl border border-drapera-border overflow-hidden shadow-2xl">
                <Image
                  src={viewerScreenshot}
                  alt={_('Interfaccia VectorEngine — viewer HPGL con riconoscimento CAD', 'VectorEngine interface — HPGL viewer with CAD recognition')}
                  className="w-full h-auto block"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CAD ORIGIN RECOGNITION ─── */}
      {cadSystems.length > 0 && (
        <section className="relative py-16 overflow-hidden">
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-white font-display mb-2">{t('home.cad_origins_title')}</h2>
              <div className="flex flex-wrap items-center gap-3 mb-6 text-[11px]">
                <span className="flex items-center gap-1.5 text-green-400"><span className="w-2 h-2 rounded-full bg-green-400" /> {_('Riconosciuto', 'Recognized')}</span>
                <span className="flex items-center gap-1.5 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-400" /> {_('Dataset disponibile', 'Dataset available')}</span>
                <span className="flex items-center gap-1.5 text-gray-500"><span className="w-2 h-2 rounded-full bg-gray-500" /> {_('Ricerca', 'Research')}</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {cadSystems.map(cad => {
                  const isTrained = cad.training_ready;
                  const isPending = !cad.training_ready && cad.status !== 'research';
                  const isResearch = cad.status === 'research';
                  let badgeClass = 'border-gray-600/30 bg-gray-700/30 text-gray-400';
                  let dotClass = 'bg-gray-500';
                  let label = _('In coda di ricerca', 'Research queue');
                  if (isTrained) { badgeClass = 'border-green-500/30 bg-green-500/10 text-green-300'; dotClass = 'bg-green-400'; label = _('Addestrato', 'Trained'); }
                  else if (isPending) { badgeClass = 'border-amber-500/30 bg-amber-500/10 text-amber-300'; dotClass = 'bg-amber-400'; label = _('Dataset in preparazione', 'Dataset in progress'); }
                  return (
                    <div key={cad.id}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${badgeClass}`}
                      title={cad.country ? `${_('Paese', 'Country')}: ${cad.country}` : ''}
                    >
                      <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                      {cad.name}
                      {isTrained && <span className="text-[9px] text-green-400/60 ml-0.5">✓</span>}
                      {isResearch && <span className="text-[9px] text-gray-500 ml-0.5">●</span>}
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-600 italic">
                {t('home.cad_disclaimer')}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ─── EARLY ACCESS ─── */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-drapera-violet/5 to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="premium-card p-8 text-center">
              <h2 className="text-2xl font-bold text-white font-display mb-3">{t('home.why_early_access')}</h2>
              <p className="text-sm text-gray-400 mb-8 max-w-xl mx-auto">
                {t('home.why_early_access_desc')}
              </p>
              <div className="grid sm:grid-cols-2 gap-6 text-left max-w-lg mx-auto">
                <div className="rounded-xl bg-white/5 border border-drapera-border p-5">
                  <p className="text-drapera-gold font-bold text-lg mb-1">{t('home.founder_title')}</p>
                  <p className="text-xs text-gray-400">{t('home.founder_desc')}</p>
                  <p className="text-[10px] text-gray-600 mt-3"><span className="text-drapera-gold font-semibold">10</span> {_('posti', 'seats')}</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-drapera-border p-5">
                  <p className="text-cyan-400 font-bold text-lg mb-1">{t('home.beta_title')}</p>
                  <p className="text-xs text-gray-400">{t('home.beta_desc')}</p>
                  <p className="text-[10px] text-gray-600 mt-3"><span className="text-cyan-400 font-semibold">20</span> {_('posti/mese', 'seats/month')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── VECTORENGINE TOOL ─── */}
      <section className="relative py-16 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-8">
            <h2 className="text-2xl font-bold text-white font-display mb-2">{t('home.section_title')}</h2>
            <p className="text-sm text-gray-400">{t('home.section_sub')}</p>
          </div>
          <div className="max-w-md mx-auto">
            <Link href="/tools/hpgl" className="block premium-card p-6 text-center hover:border-drapera-gold/40 transition-colors group">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-4 group-hover:shadow-lg group-hover:shadow-cyan-500/20 transition-shadow">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">VectorEngine<sup>™</sup></h3>
              <p className="text-xs text-gray-400 mb-4">{_('Analisi geometrica per file HPGL', 'Geometric analysis for HPGL files')}</p>
              <span className="inline-flex items-center gap-1.5 text-xs text-drapera-gold font-semibold">
                {t('cardtool.start')}
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </span>
              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="px-2 py-0.5 rounded text-[9px] bg-green-500/10 text-green-400 border border-green-500/20">{_('Attivo', 'Active')}</span>
                <span className="text-[9px] text-gray-600">·</span>
                <span className="text-[9px] text-gray-600">{_('Famiglia HPGL', 'HPGL family')}</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── UPLOAD GUIDELINES ─── */}
      <section className="relative py-16 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="premium-card p-6">
              <h2 className="text-lg font-bold text-white font-display mb-4">{t('home.upload_title')}</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <ul className="space-y-2 text-xs text-gray-400">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                      <span><strong className="text-gray-300">{_('Famiglia HPGL', 'HPGL family')}</strong> — .hpgl, .hpg, .plt {_('e altre estensioni plotter compatibili', 'and compatible plotter extensions')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
                      <span className="text-gray-500">{t('home.upload_research')}</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-3">{_('Note', 'Notes')}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {t('home.upload_notice')}
                  </p>
                </div>
                <div className="sm:col-span-2 pt-3 border-t border-drapera-border/40">
                  <h3 className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-3">{t('home.upload_contribute')}</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    {t('home.upload_contribute_desc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SURVEY ─── */}
      <section className="relative py-12 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <div className="premium-card p-5 text-center">
              <h3 className="text-base font-semibold text-white mb-2">{t('home.lab_title')}</h3>
              <p className="text-xs text-gray-500 mb-4">{t('home.lab_desc')}</p>
              <Link href="/sondaggio" className="btn-gold text-xs px-4 py-2 inline-flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                {t('home.suggest_tool')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
