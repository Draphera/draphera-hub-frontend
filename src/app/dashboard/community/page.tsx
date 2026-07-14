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
            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map(m => (
                <div key={m.id} className="premium-card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-drapera-gold to-amber-500 flex items-center justify-center text-sm font-bold text-drapera-dark shrink-0">
                    {(m.full_name?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{m.full_name || 'Anonimo'}</p>
                    {(m.company_name || m.office) && (
                      <p className="text-[10px] text-gray-500 truncate">
                        {[m.company_name, m.office].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {members.length === 0 && !msg && (
                <div className="col-span-full text-center py-12">
                  <p className="text-sm text-gray-500">Nessun membro nella community. Attiva la visibilità nelle impostazioni del profilo per essere il primo!</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
