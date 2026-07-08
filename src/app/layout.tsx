import type { Metadata } from 'next';
import Link from 'next/link';
import { Inter, Manrope } from 'next/font/google';
import '@/styles/globals.css';
import { I18nProvider } from '@/lib/i18n';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap', preload: true });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap', preload: true });

export const metadata: Metadata = {
  title: 'HPGL Viewer Online Gratuito — Draphera Hub | Visualizzatore CAD per Moda',
  description: 'Visualizzatore HPGL online gratuito per file CAD di moda (.hpgl, .plt, .hpg). Supporta Lectra, Gerber, Investronica e altri. Anteprima, export PNG/SVG/ZIP, misurazioni e griglia snap. Portale tecnico per uffici stile, modellistica e produzione.',
  keywords: ['HPGL viewer', 'visualizzatore HPGL', 'HPGL online', 'CAD moda', 'file HPGL', 'HPGL plotter', 'Lectra HPGL', 'Gerber HPGL', 'visualizzatore CAD gratuito', 'HPGL to SVG', 'HPGL to PNG', 'Draphera Hub'],
  openGraph: {
    title: 'HPGL Viewer Online — Draphera Hub',
    description: 'Visualizzatore HPGL professionale per file CAD moda. Gratuito, veloce, senza installazione.',
    url: 'https://draphera.com',
    siteName: 'Draphera Hub',
    type: 'website',
    locale: 'it_IT',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HPGL Viewer Online — Draphera Hub',
    description: 'Visualizzatore HPGL professionale per file CAD moda.',
  },
  alternates: {
    canonical: 'https://draphera.com',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`scroll-smooth ${inter.variable} ${manrope.variable}`}>
      <body className="min-h-screen bg-drapera-dark flex flex-col">
        <I18nProvider>
          <main className="flex-1">{children}</main>
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
        </I18nProvider>
      </body>
    </html>
  );
}
