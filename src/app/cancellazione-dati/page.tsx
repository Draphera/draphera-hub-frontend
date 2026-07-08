'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DataDeletionPage() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Inserisci la tua email'); return; }

    try {
      const { data: session } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.session?.access_token) {
        headers['Authorization'] = `Bearer ${session.session.access_token}`;
      }

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${API_BASE}/api/profile/delete-request`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, reason }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Errore nell\'invio della richiesta');
      }

      setSent(true);
    } catch (e: any) {
      setError(e.message || 'Errore di connessione');
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-drapera-dark flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="section-title text-white text-2xl mb-3">Richiesta Inviata</h1>
          <p className="text-gray-400 text-sm mb-6">
            Abbiamo ricevuto la tua richiesta di cancellazione dei dati. Ti contatteremo all&rsquo;indirizzo email fornito per confermare e completare la procedura entro 30 giorni.
          </p>
          <Link href="/" className="text-drapera-gold text-xs hover:underline">Torna alla home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-drapera-dark">
      <div className="max-w-2xl mx-auto px-4 py-10 pt-24">
        <Link href="/" className="text-drapera-gold text-xs hover:underline mb-6 inline-block">&larr; Torna alla home</Link>
        <h1 className="section-title text-white text-3xl mb-3">Richiesta di Cancellazione Dati</h1>
        <p className="text-gray-500 text-sm mb-8">
          Utilizza questo modulo per richiedere la cancellazione dei tuoi dati personali dalla Piattaforma.
          I file CAD caricati rimarranno memorizzati, ma tutti i dati personali (nome, email, profilo aziendale,
          preferenze) verranno rimossi.
        </p>

        <div className="premium-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email associata all&rsquo;account</label>
              <input
                type="email"
                className="w-full bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-drapera-gold/50 transition-colors"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nome@esempio.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Motivo della cancellazione (opzionale)</label>
              <textarea
                className="w-full bg-drapera-dark border border-drapera-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-drapera-gold/50 transition-colors resize-none"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Aiutaci a migliorare indicando il motivo..."
                rows={3}
              />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-900/20 border border-red-500/30 text-xs text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3 items-center pt-2">
              <button type="submit" className="px-5 py-2 bg-red-600/20 border border-red-600/40 text-red-400 text-sm font-medium rounded-lg hover:bg-red-600/30 transition-colors">
                Richiedi Cancellazione
              </button>
              <Link href="/dashboard" className="text-xs text-gray-500 hover:text-white transition-colors">
                Annulla
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
