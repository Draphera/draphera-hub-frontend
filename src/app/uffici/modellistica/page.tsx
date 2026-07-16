'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import CardTool from '@/components/CardTool';

const tools = [
  { title: 'VectorEngine', description: 'Visualizza, analizza ed esporta file HPGL/PLT/HPG. Riconoscimento CAD con Draphera VectorEngine™.', href: '/tools/hpgl', premium: true, active: true },
  { title: 'VectorEngine ISO', description: 'Analisi di modelli ISO per taglie e gradazione.', href: '/tools/iso', comingSoon: true },
  { title: 'VectorEngine DXF', description: 'Analisi DXF per componenti tecnici e particolari costruttivi.', href: '/tools/dxf', comingSoon: true },
];

export default function ModellisticaPage() {
  return (
    <div className="min-h-screen bg-drapera-dark">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        <Link href="/" className="text-xs text-drapera-steel-light hover:text-drapera-gold transition-colors mb-8 inline-block">
          &larr; Home
        </Link>
        <div className="mb-10">
          <h1 className="section-title text-white text-3xl mb-2">Modellistica &amp; CAD</h1>
          <p className="section-subtitle">Visualizzatori e riconoscimento intelligente per file tecnici di moda.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map(tool => <CardTool key={tool.href} {...tool} />)}
        </div>
      </div>
    </div>
  );
}
