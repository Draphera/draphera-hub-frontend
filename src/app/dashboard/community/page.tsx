'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import Header from '@/components/Header';
import type { Session } from '@supabase/supabase-js';

const API_BASE = '';

interface LeaderboardEntry {
  id: string;
  full_name: string;
  avatar_url?: string;
  company_name?: string;
  office?: string;
  role?: string;
  total_uploads: number;
  unique_files: number;
  bug_reports: number;
  score: number;
}

export default function CommunityPage() {
  const { lang } = useTranslation();
  const _ = useCallback((it: string, en: string) => lang === 'en' ? en : it, [lang]);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (!data.session) { router.push('/auth/signin?redirect=/dashboard/community'); return; }
      try {
        const res = await fetch(`${API_BASE}/api/profile/community/leaderboard`);
        const d = await res.json();
        setLeaderboard(d.leaderboard ?? []);
        setTotal(d.total ?? 0);
      } catch { setMsg(_('Errore caricamento classifica', 'Error loading leaderboard')); }
      setLoading(false);
    });
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-drapera-gold border-t-transparent rounded-full animate-spin" /></div>;
  if (!session) return null;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-14">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-hero-glow opacity-30" />
          <div className="absolute inset-0 grid-bg opacity-20" />
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-drapera-gold transition-colors mb-6">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              {_('Torna alla dashboard', 'Back to dashboard')}
            </Link>

            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="section-title text-white leading-tight">{_('Community', 'Community')}</h1>
                  <span className="px-2 py-0.5 rounded bg-drapera-gold/10 border border-drapera-gold/20 text-drapera-gold text-xs font-medium">{total} {_('membri', 'members')}</span>
                </div>
                <p className="section-subtitle">{_('Chi contribuisce di piu alla piattaforma.', 'Who contributes the most to the platform.')}</p>
              </div>
            </div>

            {msg && (
              <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{msg}</div>
            )}

            {/* Leaderboard table */}
            <div className="premium-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-drapera-border/50">
                      <th className="text-left px-4 py-3 text-[9px] uppercase tracking-wider text-gray-600 font-semibold w-10">#</th>
                      <th className="text-left px-4 py-3 text-[9px] uppercase tracking-wider text-gray-600 font-semibold">{_('Membro', 'Member')}</th>
                      <th className="text-center px-3 py-3 text-[9px] uppercase tracking-wider text-gray-600 font-semibold">{_('File unici', 'Unique files')}</th>
                      <th className="text-center px-3 py-3 text-[9px] uppercase tracking-wider text-gray-600 font-semibold">{_('Upload totali', 'Total uploads')}</th>
                      <th className="text-center px-3 py-3 text-[9px] uppercase tracking-wider text-gray-600 font-semibold">{_('Bug segnalati', 'Bug reports')}</th>
                      <th className="text-right px-4 py-3 text-[9px] uppercase tracking-wider text-gray-600 font-semibold">{_('Punteggio', 'Score')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((m, i) => (
                      <tr key={m.id} className="border-b border-drapera-border/20 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono
                            ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                              i === 1 ? 'bg-gray-300/20 text-gray-300' :
                              i === 2 ? 'bg-amber-600/20 text-amber-600' :
                              'bg-drapera-border/20 text-gray-600'}`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-drapera-gold to-amber-500 flex items-center justify-center text-xs font-bold text-drapera-dark shrink-0">
                              {(m.full_name?.[0] || '?').toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-white font-semibold truncate">{m.full_name || _('Anonimo', 'Anonymous')}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {m.company_name && (
                                  <span className="text-[9px] text-gray-500 truncate max-w-[120px]">{m.company_name}</span>
                                )}
                                {m.office && (
                                  <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-medium uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    {m.office === 'modellistica' ? _('Modellista', 'Pattern Maker') :
                                     m.office === 'produzione' ? _('Produzione', 'Production') :
                                     m.office === 'fornitore' ? _('Fornitore', 'Supplier') :
                                     m.office === 'freelance' ? _('Freelance', 'Freelance') : m.office}
                                  </span>
                                )}
                                {m.role === 'admin' && (
                                  <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-medium uppercase tracking-wider bg-drapera-gold/10 text-drapera-gold border border-drapera-gold/20">
                                    {_('Admin', 'Admin')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-sm font-mono text-emerald-400">{m.unique_files}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-sm font-mono text-white">{m.total_uploads}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-mono ${m.bug_reports > 0 ? 'text-red-400' : 'text-gray-600'}`}>{m.bug_reports}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-drapera-border/30 rounded-full overflow-hidden hidden sm:block">
                              <div className={`h-full rounded-full ${i === 0 ? 'bg-yellow-500' : i < 3 ? 'bg-gray-400' : 'bg-drapera-gold/50'}`}
                                style={{ width: `${leaderboard.length > 0 ? (m.score / leaderboard[0].score) * 100 : 0}%` }} />
                            </div>
                            <span className={`text-xs font-bold font-mono w-12 text-right
                              ${i === 0 ? 'text-yellow-400' :
                                i === 1 ? 'text-gray-300' :
                                i === 2 ? 'text-amber-600' :
                                'text-gray-500'}`}>
                              {m.score}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {leaderboard.length === 0 && !msg && (
                      <tr>
                        <td colSpan={6} className="text-center py-16">
                          <p className="text-sm text-gray-500">{_('Nessun membro nella community.', 'No members in the community.')}</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-[10px] text-gray-700 mt-4 text-center">
              {_('Punteggio calcolato come: file unici × 10 + upload totali × 2 + bug segnalati × 5', 'Score: unique files × 10 + total uploads × 2 + bug reports × 5')}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
