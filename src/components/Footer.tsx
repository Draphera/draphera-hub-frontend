'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

const HIDE_PATHS = ['/tools/hpgl'];

export default function Footer() {
  const { t } = useTranslation();
  const pathname = usePathname();
  if (HIDE_PATHS.includes(pathname)) return null;

  return (
    <footer className="border-t border-drapera-border/30 py-4">
      <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
        <div className="flex items-center justify-center gap-4 text-[11px]">
          <Link href="/changelog" className="text-gray-600 hover:text-drapera-gold transition-colors">{t('footer.changelog')}</Link>
          <Link href="/termini" className="text-gray-600 hover:text-drapera-gold transition-colors">{t('footer.terms')}</Link>
          <Link href="/privacy" className="text-gray-600 hover:text-drapera-gold transition-colors">{t('footer.privacy')}</Link>
          <Link href="/cancellazione-dati" className="text-gray-600 hover:text-drapera-gold transition-colors">{t('footer.data_deletion')}</Link>
        </div>
        <a href="https://draphera.com" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 hover:text-drapera-gold transition-colors block">
          {t('footer.copyright')}
        </a>
        <p className="text-[10px] text-gray-700">{t('footer.early_access')}</p>
      </div>
    </footer>
  );
}
