import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import '@/styles/globals.css';
import { I18nProvider } from '@/lib/i18n';
import Footer from '@/components/Footer';
import DrapheraGlitch from '@/components/DrapheraGlitch';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap', preload: true });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap', preload: true });

export const metadata: Metadata = {
  title: 'Draphera Hub — Technical Workspace for Fashion CAD Files',
  description: 'Upload and inspect HPGL files with VISION. Analyze geometry, structure and probable CAD origin inside the Draphera technical workspace.',
  keywords: ['Draphera Hub', 'VISION', 'VectorEngine', 'HPGL', 'CAD fashion', 'technical workspace', 'CAD origin recognition', 'HPGL viewer', 'geometric analysis', 'industrial geometry'],
  openGraph: {
    title: 'Draphera Hub — Technical Workspace for Fashion CAD Files',
    description: 'Upload and inspect HPGL files with VISION. Analyze geometry, structure and probable CAD origin inside the Draphera technical workspace.',
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
          <DrapheraGlitch />
        </I18nProvider>
      </body>
    </html>
  );
}
