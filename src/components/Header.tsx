'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import type { Session } from '@supabase/supabase-js';

interface HeaderProps {
  onExportPng?: () => void;
  onExportZip?: () => void;
  hasFile?: boolean;
}

export default function Header({ onExportPng, onExportZip, hasFile }: HeaderProps) {
  const { t, lang, setLang } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const isHpgl = pathname === '/tools/hpgl';

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener?.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const navTools = [
    { label: t('nav.hpgl_viewer'), href: '/tools/hpgl', active: true },
    { label: 'ISO Viewer', href: '/tools/iso', comingSoon: true },
    { label: 'DXF Viewer', href: '/tools/dxf', comingSoon: true },
    { label: 'TechSheet Light', href: '/tools/techsheet-light', comingSoon: true },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-drapera-dark border-b border-drapera-border flex items-center px-4">
      <div className="flex items-center gap-3 min-w-[180px]">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-drapera-gold to-amber-500 flex items-center justify-center">
            <span className="text-drapera-dark font-display font-extrabold text-xs">D</span>
          </div>
          <span className="font-display font-bold text-base text-white group-hover:text-drapera-gold transition-colors">
            Draphera<span className="text-drapera-gold">Hub</span>
          </span>
        </Link>
      </div>

      <nav className="hidden lg:flex items-center gap-0.5 mx-4 flex-1 justify-center">
        <Link href="/dashboard" className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${pathname === '/dashboard' ? 'text-drapera-gold bg-drapera-gold/10' : 'text-gray-500 hover:text-white'}`}>
          {t('nav.dashboard')}
        </Link>
        <span className="text-drapera-border mx-1">|</span>
        {navTools.map(tool => (
          <Link
            key={tool.href}
            href={tool.active ? tool.href : '#'}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              pathname === tool.href ? 'text-drapera-gold bg-drapera-gold/10' : tool.comingSoon ? 'text-gray-600 cursor-not-allowed' : 'text-gray-500 hover:text-white'
            }`}
            onClick={e => { if (tool.comingSoon) e.preventDefault(); }}
          >
            {tool.label}
            {tool.comingSoon && <span className="text-[9px] uppercase tracking-wider text-gray-700 bg-drapera-border/50 px-1.5 py-0.5 rounded">{t('dashboard.soon')}</span>}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2 ml-auto">
        <div className="hidden sm:flex items-center gap-1.5 pr-3 border-r border-drapera-border">
          <button onClick={() => setLang('it')} className={`text-xs font-medium px-2 py-1 rounded transition-colors ${lang === 'it' ? 'text-drapera-gold bg-drapera-gold/10' : 'text-gray-500 hover:text-white'}`}>
            {t('lang.it')}
          </button>
          <button onClick={() => setLang('en')} className={`text-xs font-medium px-2 py-1 rounded transition-colors ${lang === 'en' ? 'text-drapera-gold bg-drapera-gold/10' : 'text-gray-500 hover:text-white'}`}>
            {t('lang.en')}
          </button>
        </div>

        {isHpgl && (
          <>
            <button onClick={onExportPng} disabled={!hasFile} className="btn-ghost text-xs px-3 py-1.5 hidden sm:inline-flex">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              {t('nav.export')}
            </button>
            <button onClick={onExportZip} disabled={!hasFile} className="btn-gold text-xs px-3 py-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {t('nav.generate_zip')}
            </button>
          </>
        )}

        {session ? (
          <button onClick={handleSignOut} className="btn-ghost text-xs px-3 py-1.5">{t('nav.signout')}</button>
        ) : (
          <Link href="/auth/signin" className="btn-gold text-xs px-3 py-1.5">{t('nav.signin')}</Link>
        )}

        <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden ml-2 p-1.5 text-gray-400 hover:text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="absolute top-14 left-0 right-0 lg:hidden border-t border-drapera-border bg-drapera-dark/95 backdrop-blur-2xl animate-fade-in">
          <div className="px-4 py-3 space-y-1 max-h-[70vh] overflow-y-auto">
            <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5">{t('nav.dashboard')}</Link>
            <div className="h-px bg-drapera-border/50 my-2" />
            {navTools.map(tool => (
              <Link key={tool.href} href={tool.active ? tool.href : '#'} onClick={() => { if (tool.active) setMobileOpen(false); }}
                className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg ${tool.comingSoon ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                {tool.label}
                {tool.comingSoon && <span className="text-[9px] uppercase text-gray-700 bg-drapera-border/50 px-1.5 py-0.5 rounded">{t('dashboard.soon')}</span>}
              </Link>
            ))}
            <div className="h-px bg-drapera-border/50 my-2" />
            <div className="flex items-center gap-2 px-3 pt-1">
              <button onClick={() => setLang('it')} className={`text-xs px-2 py-1 rounded ${lang === 'it' ? 'text-drapera-gold bg-drapera-gold/10' : 'text-gray-500'}`}>{t('lang.it')}</button>
              <button onClick={() => setLang('en')} className={`text-xs px-2 py-1 rounded ${lang === 'en' ? 'text-drapera-gold bg-drapera-gold/10' : 'text-gray-500'}`}>{t('lang.en')}</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
