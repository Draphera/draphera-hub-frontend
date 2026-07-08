'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import { useTranslation } from '@/lib/i18n';

const VERSIONS = [
  {
    tag: '1.1.0',
    date: '2024-07-08',
    changes: [
      { type: 'added' as const, items: [
        'Statistiche home con dettaglio vendor CAD',
        'Selettore CAD dinamico nel profilo azienda',
        'Pagina changelog',
        'Traduzioni complete IT/EN',
      ]},
      { type: 'changed' as const, items: [
        'Zona Pericolo spostata in Profilo Azienda',
        'File size limit: 50MB → 5MB',
        'Autenticazione: solo Google + GitHub',
      ]},
      { type: 'fixed' as const, items: [
        'HPGL viewer: pan bloccato, dimensioni reali, parsing indicator',
        'Sidebar: validazione estensioni file',
        'InfoPanel: gestione safe Infinity/NaN',
        'Pulsante Measure ora funzionante',
      ]},
    ],
  },
  {
    tag: '1.0.1',
    date: '2024-07-07',
    changes: [
      { type: 'added' as const, items: [
        'Security hardening: JWT, ReDoS, ZIP slip, SVG escape',
        'Timeout fetch via AbortController',
      ]},
      { type: 'fixed' as const, items: [
        'Encodig URL per Supabase',
        'UUID validation su user_id',
        'Promise.all → Promise.allSettled in dashboard',
      ]},
    ],
  },
  {
    tag: '1.0.0',
    date: '2024-07-06',
    changes: [
      { type: 'added' as const, items: [
        'CAD trainer: supporto ISO/DXF, pattern filename, marker detection',
        'Rilevamento format family (HPGL/2, ASTM, RS274, AAMA DXF)',
        'Pagine legali: Termini, Privacy, Cancellazione Dati',
        'Link social (LinkedIn, Facebook, Instagram, GitHub) nel profilo',
        'Delete account endpoint + danger zone',
      ]},
      { type: 'changed' as const, items: [
        'Footer con link a documenti legali',
        'Dashboard con upload history e livelli',
      ]},
    ],
  },
];

const TYPE_STYLES: Record<string, string> = {
  added: 'bg-green-500/10 text-green-400 border-green-500/20',
  changed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  fixed: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const TYPE_LABELS: Record<string, string> = {
  added: 'Aggiunto',
  changed: 'Modificato',
  fixed: 'Corretto',
};

const TYPE_LABELS_EN: Record<string, string> = {
  added: 'Added',
  changed: 'Changed',
  fixed: 'Fixed',
};

export default function ChangelogPage() {
  const { t, lang } = useTranslation();
  const labels = lang === 'en' ? TYPE_LABELS_EN : TYPE_LABELS;

  return (
    <div className="min-h-screen bg-drapera-dark">
      <Header />
      <main className="max-w-3xl mx-auto px-4 pt-24 pb-20">
        <Link href="/" className="text-xs text-drapera-steel-light hover:text-drapera-gold transition-colors mb-8 inline-block">
          &larr; {t('changelog.back')}
        </Link>
        <h1 className="section-title text-white text-3xl mb-2">{t('changelog.title')}</h1>
        <p className="section-subtitle mb-10">{t('changelog.subtitle')}</p>
        <div className="space-y-8">
          {VERSIONS.map(v => (
            <div key={v.tag} className="premium-card p-6">
              <div className="flex items-baseline justify-between mb-4">
                <span className="text-lg font-bold text-drapera-gold font-mono">v{v.tag}</span>
                <span className="text-xs text-gray-500 font-mono">{v.date}</span>
              </div>
              <div className="space-y-4">
                {v.changes.map((section, idx) => (
                  <div key={idx}>
                    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${TYPE_STYLES[section.type]}`}>
                      {labels[section.type]}
                    </span>
                    <ul className="mt-2 space-y-1">
                      {section.items.map((item, i) => (
                        <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                          <span className="text-drapera-gold/40 mt-1">&#x2022;</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
