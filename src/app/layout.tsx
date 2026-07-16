import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import '@/styles/globals.css';
import { I18nProvider } from '@/lib/i18n';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap', preload: true });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap', preload: true });

export const metadata: Metadata = {
  title: 'Draphera Hub — Ecosistema Tecnico dello Standard Draphera',
  description: 'Draphera Hub è il modulo operativo dell\'Ecosistema Draphera, parte dello Standard Draphera per modellistica, dati vettoriali e preservazione industriale. VectorEngine™ HPGL, ISO, DXF e strumenti CAD.',
  keywords: ['VectorEngine', 'HPGL viewer', 'visualizzatore HPGL', 'HPGL online', 'CAD moda', 'file HPGL', 'HPGL plotter', 'Lectra HPGL', 'Gerber HPGL', 'visualizzatore CAD gratuito', 'HPGL to SVG', 'HPGL to PNG', 'Draphera Hub', 'VectorEngine', 'Standard Draphera'],
  openGraph: {
    title: 'Draphera Hub — Ecosistema Tecnico dello Standard Draphera',
    description: 'Modulo operativo dell\'Ecosistema Draphera per modellistica, dati vettoriali e preservazione industriale.',
    url: 'https://hub.draphera.com',
    siteName: 'Draphera Hub',
    type: 'website',
    locale: 'it_IT',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Draphera Hub — Ecosistema Tecnico',
    description: 'Modulo operativo dell\'Ecosistema Draphera per modellistica e dati vettoriali.',
  },
  alternates: {
    canonical: 'https://hub.draphera.com',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`scroll-smooth ${inter.variable} ${manrope.variable}`}>
      <body className="min-h-screen bg-drapera-dark flex flex-col">
        <I18nProvider>
          <main className="flex-1">{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
