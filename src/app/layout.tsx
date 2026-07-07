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
      <body className="min-h-screen bg-drapera-dark">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
