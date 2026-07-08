import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-drapera-dark flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-drapera-gold/30 font-display mb-4">404</p>
        <h2 className="text-2xl font-bold text-white mb-2">Pagina non trovata</h2>
        <p className="text-gray-500 text-sm mb-8">La pagina che cerchi non esiste o è stata spostata.</p>
        <Link href="/" className="btn-gold text-sm px-6 py-2.5">Torna alla home</Link>
      </div>
    </div>
  );
}
