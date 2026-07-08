import type { Metadata } from 'next';
import '@/styles/globals.css';
import { I18nProvider } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Draphera Hub — Portale Tecnico Moda',
  description: 'Piattaforma tecnica per uffici stile, modellistica, prodotto e produzione. Strumenti HPGL e molto altro.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="scroll-smooth">
      <body className="min-h-screen bg-drapera-dark flex flex-col">
        <I18nProvider>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-drapera-border/30 py-4">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <a href="https://draphera.com" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 hover:text-drapera-gold transition-colors">
                &copy; 2026 Draphera.com &mdash; Portale Tecnico Moda
              </a>
            </div>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
