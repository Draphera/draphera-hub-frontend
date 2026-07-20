'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { adminApi, profileApi } from '@/lib/api';
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
  const [userMenu, setUserMenu] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<Record<string, string>>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const isHpgl = pathname === '/tools/hpgl';

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        adminApi.check().then(a => setIsAdmin(a.is_admin)).catch(() => {});
        profileApi.get().then(p => setProfile(p)).catch(() => {});
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) adminApi.check().then(a => setIsAdmin(a.is_admin)).catch(() => {});
      else setIsAdmin(false);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenu(false);
    };
    if (userMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userMenu]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserMenu(false);
    router.push('/');
  };

  const initials = session?.user?.email?.[0]?.toUpperCase() || '?';
  const userName = profile.full_name || session?.user?.user_metadata?.full_name || session?.user?.email || '';
  const avatarUrl = profile.avatar_url;

  const [ufficiOpen, setUfficiOpen] = useState(false);
  const ufficiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ufficiRef.current && !ufficiRef.current.contains(e.target as Node)) setUfficiOpen(false);
    };
    if (ufficiOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ufficiOpen]);

  const navTools = [
    { label: 'VectorEngine', href: '/tools/hpgl', active: true, group: 'viewers' },
    { label: 'VectorEngine ISO', href: '/tools/iso', comingSoon: true, group: 'viewers' },
    { label: 'VectorEngine DXF', href: '/tools/dxf', comingSoon: true, group: 'viewers' },
    { label: 'TechSheet Light', href: '/tools/techsheet-light', comingSoon: true, group: 'generators' },
    { label: 'BOM Generator', href: '/tools/bom-generator', comingSoon: true, group: 'generators' },
    { label: t('header.label_generator'), href: '/tools/generatore-etichette', comingSoon: true, group: 'generators' },
    { label: 'Material Normalizer', href: '/tools/material-normalizer', comingSoon: true, group: 'normalizers' },
    { label: 'Accessory Normalizer', href: '/tools/accessory-normalizer', comingSoon: true, group: 'normalizers' },
    { label: t('header.checklist_quality'), href: '/tools/checklist-qualita', comingSoon: true, group: 'quality' },
  ];

  const uffici = [
    { label: t('header.office_stile'), href: '/uffici/stile' },
    { label: t('header.office_modellistica'), href: '/uffici/modellistica' },
    { label: t('header.office_prodotto'), href: '/uffici/prodotto' },
    { label: t('header.office_produzione'), href: '/uffici/produzione' },
  ];

  const toolGroups: Record<string, { label: string; tools: typeof navTools }> = {
    viewers: { label: t('header.group_viewers'), tools: navTools.filter(t => t.group === 'viewers') },
    generators: { label: t('header.group_generators'), tools: navTools.filter(t => t.group === 'generators') },
    normalizers: { label: t('header.group_normalizers'), tools: navTools.filter(t => t.group === 'normalizers') },
    quality: { label: t('header.group_quality'), tools: navTools.filter(t => t.group === 'quality') },
  };

  useEffect(() => {
    setUfficiOpen(false);
  }, [pathname]);

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
        <Link href="/" className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${pathname === '/' ? 'text-drapera-gold bg-drapera-gold/10' : 'text-gray-500 hover:text-white'}`}>
          {t('nav.home')}
        </Link>
        <span className="text-drapera-border mx-0.5 text-[10px] font-medium">/</span>
        <Link href="/tools/hpgl" className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${pathname === '/tools/hpgl' ? 'text-drapera-gold bg-drapera-gold/10' : 'text-gray-500 hover:text-white'}`}>
          VectorEngine
        </Link>
        <span className="text-drapera-border mx-0.5 text-[10px] font-medium">/</span>
        <Link href="/dashboard" className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${pathname === '/dashboard' ? 'text-drapera-gold bg-drapera-gold/10' : 'text-gray-500 hover:text-white'}`}>
          Workspace
        </Link>
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
          <div className="relative" ref={menuRef}>
            <button onClick={() => setUserMenu(!userMenu)} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-drapera-gold to-amber-500 flex items-center justify-center text-xs font-bold text-drapera-dark overflow-hidden">
                {avatarUrl ? <Image src={avatarUrl} alt="" width={28} height={28} className="w-full h-full object-cover" /> : initials}
              </div>
              <span className="hidden sm:block text-xs text-gray-400 max-w-[100px] truncate">{userName}</span>
              <svg className={`w-3 h-3 text-gray-500 transition-transform ${userMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {userMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 py-1.5 bg-drapera-dark border border-drapera-border rounded-xl shadow-2xl animate-fade-in">
                <div className="px-3 py-2 border-b border-drapera-border/50">
                  <p className="text-xs text-white font-medium truncate">{userName}</p>
                  <p className="text-[10px] text-gray-500 truncate">{session.user?.email}</p>
                </div>
                <Link href="/dashboard" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7m-9 2v6m4-6v6" /></svg>
                  {t('nav.dashboard')}
                </Link>
                <Link href="/dashboard/community" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm1.13 1.1c-.37-.06-.74-.1-1.13-.1-.99 0-1.93.21-2.78.58A2.01 2.01 0 000 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29zM20 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-1.13 1.1c.37-.06.74-.1 1.13-.1.99 0 1.93.21 2.78.58A2.01 2.01 0 0124 16.43V18h-4.5v-1.61c0-.83-.23-1.61-.63-2.29zM12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z" /></svg>
                  Community
                </Link>
                <Link href="/dashboard/settings" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {t('profile.title')}
                </Link>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    {t('admin.title')}
                  </Link>
                )}
                <div className="border-t border-drapera-border/50 mt-1 pt-1">
                  <button onClick={handleSignOut} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    {t('nav.signout')}
                  </button>
                </div>
              </div>
            )}
          </div>
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
            {session && (
              <div className="px-3 py-2 border-b border-drapera-border/50 mb-2">
                <p className="text-sm text-white font-medium">{userName}</p>
                <p className="text-[11px] text-gray-500">{session.user?.email}</p>
              </div>
            )}
            <Link href="/" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5">{t('nav.home')}</Link>
            <Link href="/tools/hpgl" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5">VectorEngine</Link>
            <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5">Workspace</Link>
            {session && (
              <>
                <Link href="/dashboard/settings" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5">{t('profile.title')}</Link>
                {isAdmin && <Link href="/admin" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5">{t('admin.title')}</Link>}
                <button onClick={handleSignOut} className="block w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300 rounded-lg hover:bg-white/5">{t('nav.signout')}</button>
              </>
            )}
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
