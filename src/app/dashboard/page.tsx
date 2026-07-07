'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { useTranslation } from '@/lib/i18n';
import type { Session } from '@supabase/supabase-js';

export default function DashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) router.push('/auth/signin?redirect=/dashboard');
      setLoading(false);
    });
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-drapera-gold border-t-transparent rounded-full animate-spin" /></div>;
  if (!session) return null;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div>
            <h1 className="section-title text-white">{t('dashboard.title')}</h1>
            <p className="text-drapera-steel-light mt-1">{t('dashboard.subtitle')}</p>
          </div>
          <Link href="/tools/hpgl" className="btn-gold">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            {t('dashboard.open_hpgl')}
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="font-display font-bold text-xl text-white mb-5">{t('dashboard.tools')}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { title: 'HPGL Viewer', href: '/tools/hpgl', active: true },
                { title: 'ISO Viewer', href: '/tools/iso' },
                { title: 'DXF Viewer', href: '/tools/dxf' },
                { title: 'TechSheet Light', href: '/tools/techsheet-light' },
              ].map(tool => (
                <Link key={tool.href} href={tool.active ? tool.href : '#'} onClick={e => { if (!tool.active) e.preventDefault(); }}>
                  <div className={`premium-card flex items-center justify-between ${tool.active ? 'border-drapera-gold/20' : 'opacity-40'}`}>
                    <span className="font-display font-semibold text-sm text-white">{tool.title}</span>
                    {tool.active ? (
                      <span className="text-[10px] text-drapera-gold font-medium">{t('dashboard.active')}</span>
                    ) : (
                      <span className="text-[10px] text-gray-600">{t('dashboard.soon')}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-white mb-5">{t('dashboard.info')}</h2>
            <div className="premium-card space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-drapera-border/50">
                <span className="text-xs text-gray-400">{t('dashboard.active_count')}</span>
                <span className="text-sm text-drapera-gold font-bold">1</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-drapera-border/50">
                <span className="text-xs text-gray-400">{t('dashboard.dev_count')}</span>
                <span className="text-sm text-white font-bold">8</span>
              </div>
              <div className="pt-2">
                <Link href="/tools/hpgl" className="btn-gold w-full text-center text-xs">{t('dashboard.go_hpgl')}</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
