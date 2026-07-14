'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { useTranslation } from '@/lib/i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const SUGGESTED_TOOLS = [
  { id: 'iso-viewer-full', label: 'ISO Viewer completo (salvataggio, CAD detection)' },
  { id: 'dxf-viewer-full', label: 'DXF Viewer completo' },
  { id: 'techsheet', label: 'TechSheet (scheda tecnica modello)' },
  { id: 'material-normalizer', label: 'Normalizzatore materiali ERP' },
  { id: 'bom-generator', label: 'Generatore distinte base (BOM)' },
  { id: 'label-generator', label: 'Generatore etichette prodotto' },
  { id: 'quality-checklist', label: 'Checklist qualità collaudi' },
  { id: 'consumption', label: 'Calcolo consumi tessuto' },
  { id: 'nesting', label: 'Piazzamento automatico (nesting)' },
  { id: 'grading', label: 'Gradation / scalatura taglie' },
  { id: 'integration', label: 'Integrazione con altri CAD' },
  { id: 'api', label: 'API per integrazione ERP' },
  { id: 'other', label: 'Altro (scrivi sotto)' },
];

export default function SondaggioPage() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      tools: selected,
      other: otherText,
      email: email || undefined,
    };
    try {
      await fetch(`${API_BASE}/api/profile/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {}
    setSent(true);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-drapera-dark">
        <Header />
        <div className="max-w-xl mx-auto px-4 pt-24 pb-20 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Grazie per il feedback!</h1>
          <p className="text-gray-500 mb-6">{t('sondaggio.thanks_desc')}</p>
          <Link href="/dashboard" className="btn-gold text-sm px-6 py-2.5">Vai alla dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-drapera-dark">
      <Header />
      <main className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <Link href="/dashboard" className="text-xs text-drapera-steel-light hover:text-drapera-gold transition-colors mb-8 inline-block">&larr; Dashboard</Link>
        <h1 className="section-title text-white text-2xl mb-2">Prossimi tool</h1>
        <p className="text-sm text-gray-500 mb-8">Seleziona quali strumenti vorresti vedere in Draphera Hub. Le tue preferenze guideranno lo sviluppo.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-2">
            {SUGGESTED_TOOLS.map(t => (
              <button key={t.id} type="button" onClick={() => toggle(t.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs text-left transition-all ${
                  selected.includes(t.id)
                    ? 'border-drapera-gold bg-drapera-gold/10 text-drapera-gold'
                    : 'border-drapera-border text-gray-400 hover:border-drapera-gold/30 hover:text-white'
                }`}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  selected.includes(t.id) ? 'bg-drapera-gold border-drapera-gold' : 'border-drapera-border'
                }`}>
                  {selected.includes(t.id) && <svg className="w-3 h-3 text-drapera-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Il tuo suggerimento (se hai selezionato &quot;Altro&quot;)</label>
            <input type="text" value={otherText} onChange={e => setOtherText(e.target.value)}
              className="w-full bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-drapera-gold/50"
              placeholder="Descrivi il tool che vorresti..." />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Email (opzionale, per ricevere aggiornamenti)</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-drapera-gold/50"
              placeholder="mario@esempio.com" />
          </div>

          <button type="submit" disabled={selected.length === 0} className="btn-gold text-sm px-6 py-2.5 disabled:opacity-40">Invia preferenze</button>
        </form>
      </main>
    </div>
  );
}
