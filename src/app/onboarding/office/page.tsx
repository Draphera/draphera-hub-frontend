'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { profileApi } from '@/lib/api';

const OFFICES = [
  { id: 'stile', label: 'Ufficio Stile', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
  { id: 'modellistica', label: 'Modellista', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7' },
  { id: 'cad', label: 'CAD', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'prototipia', label: 'Prototipia', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
  { id: 'produzione', label: 'Produzione', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { id: 'fornitore', label: 'Fornitore', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z' },
  { id: 'freelance', label: 'Freelance', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
];

export default function OnboardingOfficePage() {
  const router = useRouter();
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/auth/signin');
    });
  }, [router]);

  const handleContinue = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await profileApi.update({ office: selected });
      router.push('/dashboard');
    } catch { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-drapera-dark flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-drapera-gold to-amber-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-drapera-dark font-display font-extrabold text-lg">D</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-white mb-2">Benvenuto su Draphera Hub</h1>
          <p className="text-sm text-drapera-steel-light">Scegli il tuo ufficio per personalizzare l&apos;esperienza.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {OFFICES.map(o => (
            <button key={o.id} onClick={() => setSelected(o.id)}
              className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                selected === o.id
                  ? 'border-drapera-gold bg-drapera-gold/10 text-drapera-gold'
                  : 'border-drapera-border bg-drapera-surface/40 text-gray-400 hover:border-drapera-gold/30 hover:text-white'
              }`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                selected === o.id ? 'bg-drapera-gold/20' : 'bg-white/5'
              }`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={o.icon} /></svg>
              </div>
              <span className="text-sm font-medium">{o.label}</span>
            </button>
          ))}
        </div>

        <div className="text-center">
          <button onClick={handleContinue} disabled={!selected || saving}
            className="btn-gold text-sm px-8 py-2.5 disabled:opacity-40">
            {saving ? '...' : 'Continua → Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
