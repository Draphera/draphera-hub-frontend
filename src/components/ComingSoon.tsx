'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

interface Props {
  title: string;
  description?: string;
}

export default function ComingSoon({ title, description }: Props) {
  const { t } = useTranslation();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 pt-14">
      <div className="coming-soon-card max-w-lg mx-auto">
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-drapera-gold/5 border border-drapera-gold/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-drapera-gold/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="font-display font-bold text-xl text-white mb-2">{title}</h2>
          <p className="text-sm text-drapera-steel-light mb-6">{description || t('coming_soon.desc')}</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-drapera-gold/20 bg-drapera-gold/5 text-drapera-gold text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-drapera-gold animate-pulse-gold" />
            {t('coming_soon.title')}
          </div>
          <div className="mt-6">
            <Link href="/tools/hpgl" className="btn-gold text-xs">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              {t('coming_soon.back')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
