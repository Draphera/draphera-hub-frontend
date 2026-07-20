'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { userApi } from '@/lib/api';

const HIDE_PATHS = ['/tools/hpgl'];

export default function Footer() {
  const { lang } = useTranslation();
  const _ = (it: string, en: string) => lang === 'en' ? en : it;
  const pathname = usePathname();
  const [showBugModal, setShowBugModal] = useState(false);
  const [bugDesc, setBugDesc] = useState('');
  const [bugSent, setBugSent] = useState(false);
  const [bugError, setBugError] = useState('');

  if (HIDE_PATHS.includes(pathname)) return null;

  const submitBug = async () => {
    setBugError('');
    try {
      await userApi.submitBugReport({ description: bugDesc, page: pathname });
      setBugSent(true);
      setTimeout(() => { setShowBugModal(false); setBugSent(false); setBugDesc(''); }, 2000);
    } catch (e: any) {
      setBugError(e.message);
    }
  };

  return (
    <>
      <footer className="border-t border-drapera-border/30 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid sm:grid-cols-3 gap-6 mb-6 text-center sm:text-left">
            <div>
              <p className="text-[11px] font-semibold text-white uppercase tracking-wider mb-2">{_('Piattaforma', 'Platform')}</p>
              <div className="space-y-1.5">
                <Link href="/" className="block text-[11px] text-gray-600 hover:text-drapera-gold transition-colors">Draphera Hub</Link>
                <Link href="/tools/hpgl" className="block text-[11px] text-gray-600 hover:text-drapera-gold transition-colors">VectorEngine</Link>
                <a href="https://draphera.com" target="_blank" rel="noopener noreferrer" className="block text-[11px] text-gray-600 hover:text-drapera-gold transition-colors">VISION</a>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-white uppercase tracking-wider mb-2">{_('Risorse', 'Resources')}</p>
              <div className="space-y-1.5">
                <Link href="/changelog" className="block text-[11px] text-gray-600 hover:text-drapera-gold transition-colors">{_('Novità', 'Changelog')}</Link>
                <Link href="/termini" className="block text-[11px] text-gray-600 hover:text-drapera-gold transition-colors">{_('Termini', 'Terms')}</Link>
                <Link href="/privacy" className="block text-[11px] text-gray-600 hover:text-drapera-gold transition-colors">{_('Privacy', 'Privacy')}</Link>
                <a href="https://github.com/Draphera" target="_blank" rel="noopener noreferrer" className="block text-[11px] text-gray-600 hover:text-drapera-gold transition-colors">GitHub</a>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-white uppercase tracking-wider mb-2">{_('Contatti', 'Contact')}</p>
              <div className="space-y-1.5">
                <button onClick={() => setShowBugModal(true)} className="block text-[11px] text-gray-600 hover:text-red-400 transition-colors">{_('Segnala bug', 'Report bug')}</button>
                <Link href="/cancellazione-dati" className="block text-[11px] text-gray-600 hover:text-drapera-gold transition-colors">{_('Cancellazione dati', 'Data deletion')}</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-drapera-border/20 pt-4 text-center">
            <a href="https://draphera.com" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 hover:text-drapera-gold transition-colors">
              © {new Date().getFullYear()} Draphera.com — {_('Infrastruttura per la geometria industriale', 'Infrastructure for industrial geometry')}
            </a>
          </div>
        </div>
      </footer>

      {showBugModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-drapera-dark border border-drapera-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            {bugSent ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-white font-medium">{_('Grazie!', 'Thanks!')}</p>
                <p className="text-gray-500 text-sm mt-1">{_('Segnalazione inviata.', 'Report sent.')}</p>
              </div>
            ) : (
              <>
                <h3 className="text-white font-bold text-base mb-1">{_('Segnala un problema', 'Report an issue')}</h3>
                <p className="text-gray-500 text-xs mb-4">{_('Descrivi cosa non funziona o cosa miglioreresti. Ci aiuti a rendere VectorEngine migliore.', 'Describe what is not working or what you would improve.')}</p>
                <textarea value={bugDesc} onChange={e => setBugDesc(e.target.value)} rows={4}
                  placeholder={_('Descrivi il problema...', 'Describe the issue...')}
                  className="w-full bg-drapera-darker border border-drapera-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-400/50 resize-none" />
                {bugError && <p className="text-red-400 text-xs mt-1">{bugError}</p>}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowBugModal(false)} className="flex-1 px-3 py-2 rounded-lg border border-drapera-border text-gray-400 text-sm hover:text-white transition-colors">
                    {_('Annulla', 'Cancel')}
                  </button>
                  <button onClick={submitBug} disabled={bugDesc.length < 10}
                    className="flex-1 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50">
                    {_('Invia', 'Send')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
