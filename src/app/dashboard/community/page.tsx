'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import type { Session } from '@supabase/supabase-js';

const API_BASE = '';

interface CommunityMember {
  id: string;
  full_name: string;
  avatar_url?: string;
  company_name?: string;
  office?: string;
}

export default function CommunityPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [total, setTotal] = useState(0);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (!data.session) { router.push('/auth/signin?redirect=/dashboard/community'); return; }
      try {
        const res = await fetch(`${API_BASE}/api/profile/community`);
        const data = await res.json();
        setMembers(data.members ?? []);
        setTotal(data.total ?? 0);
      } catch { setMsg('Errore caricamento community'); }
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
              Torna alla dashboard
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="section-title text-white leading-tight">Community</h1>
              <span className="px-2 py-0.5 rounded bg-drapera-gold/10 border border-drapera-gold/20 text-drapera-gold text-xs font-medium">{total} membri</span>
            </div>
            <p className="section-subtitle max-w-xl">Persone che usano Draphera Hub e hanno scelto di comparire pubblicamente.</p>
            {msg && (
              <div className="mt-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{msg}</div>
            )}
            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {members.map(m => (
                <div key={m.id} className="group premium-card p-5 flex items-center gap-4 hover:border-drapera-gold/30 transition-all duration-300 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-drapera-gold/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-drapera-gold to-amber-500 flex items-center justify-center text-lg font-bold text-drapera-dark shrink-0 shadow-lg shadow-drapera-gold/20">
                      {(m.full_name?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-drapera-midnight flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                  </div>
                  <div className="min-w-0 relative">
                    <p className="text-sm text-white font-semibold truncate group-hover:text-drapera-gold transition-colors">{m.full_name || 'Anonimo'}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {m.company_name && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                          {m.company_name}
                        </span>
                      )}
                      {m.office && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {m.office === 'modellistica' ? 'Modellista' :
                           m.office === 'produzione' ? 'Produzione' :
                           m.office === 'fornitore' ? 'Fornitore' :
                           m.office === 'freelance' ? 'Freelance' : m.office}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {members.length === 0 && !msg && (
                <div className="col-span-full text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-drapera-gold/5 border border-drapera-gold/10 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-drapera-gold/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <p className="text-sm text-gray-500">Nessun membro nella community.</p>
                  <p className="text-xs text-gray-600 mt-1">Attiva la visibilità nelle impostazioni del profilo per essere il primo!</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
