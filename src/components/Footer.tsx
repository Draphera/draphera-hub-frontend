'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const HIDE_PATHS = ['/tools/hpgl'];

export default function Footer() {
  const pathname = usePathname();
  if (HIDE_PATHS.includes(pathname)) return null;

  return (
    <footer className="border-t border-drapera-border/30 py-4">
      <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
        <div className="flex items-center justify-center gap-4 text-[11px]">
          <Link href="/changelog" className="text-gray-600 hover:text-drapera-gold transition-colors">Changelog</Link>
          <Link href="/termini" className="text-gray-600 hover:text-drapera-gold transition-colors">Condizioni d&rsquo;Uso</Link>
          <Link href="/privacy" className="text-gray-600 hover:text-drapera-gold transition-colors">Privacy Policy</Link>
          <Link href="/cancellazione-dati" className="text-gray-600 hover:text-drapera-gold transition-colors">Cancellazione Dati</Link>
        </div>
        <a href="https://draphera.com" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 hover:text-drapera-gold transition-colors block">
          &copy; 2026 Draphera.com &mdash; Portale Tecnico Moda
        </a>
      </div>
    </footer>
  );
}
