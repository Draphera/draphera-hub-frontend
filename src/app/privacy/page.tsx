import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Draphera Hub',
  description: 'Informativa privacy di Draphera Hub. Scopri come trattiamo i tuoi dati personali e i file CAD caricati sulla piattaforma.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-drapera-dark">
      <div className="max-w-3xl mx-auto px-4 py-10 pt-24">
        <Link href="/" className="text-drapera-gold text-xs hover:underline mb-6 inline-block">&larr; Torna alla home</Link>
        <h1 className="section-title text-white text-3xl mb-8">Informativa sulla Privacy</h1>

        <div className="prose prose-invert prose-sm max-w-none text-gray-400 space-y-6">
          <section>
            <h2 className="text-white text-lg font-display font-bold mb-3">1. Titolare del trattamento</h2>
            <p>Il titolare del trattamento dei dati è Draphera. Per comunicazioni relative alla privacy, scrivere a <a href="mailto:info@draphera.com" className="text-drapera-gold hover:underline">info@draphera.com</a>.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-display font-bold mb-3">2. Dati raccolti</h2>
            <p>Raccogliamo i seguenti dati personali:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Dati di registrazione:</strong> nome, cognome, email, avatar (se fornito)</li>
              <li><strong>Dati del profilo aziendale:</strong> nome azienda, telefono, indirizzo, sito web, partita IVA, sistema CAD utilizzato</li>
              <li><strong>Dati di utilizzo:</strong> file caricati (HPGL, ISO, DXF), statistiche di utilizzo, cronologia upload</li>
              <li><strong>Dati di accesso:</strong> indirizzo IP, user agent, data e ora di accesso</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-lg font-display font-bold mb-3">3. Finalità del trattamento</h2>
            <p>I dati sono trattati per le seguenti finalità:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Fornire i servizi della Piattaforma (visualizzazione CAD, normalizzazione materiali, BOM)</li>
              <li>Gestire l&rsquo;account utente e il profilo aziendale</li>
              <li>Migliorare i servizi attraverso analisi statistiche anonime</li>
              <li>Comunicazioni relative al servizio (novità, aggiornamenti)</li>
              <li>Adempiere a obblighi di legge</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-lg font-display font-bold mb-3">4. Base giuridica</h2>
            <p>Il trattamento si basa sul consenso dell&rsquo;utente (art. 6 par. 1 lett. a GDPR) e sulla necessità di eseguire il servizio richiesto (art. 6 par. 1 lett. b GDPR).</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-display font-bold mb-3">5. Condivisione dei dati</h2>
            <p>I dati non vengono venduti a terzi. Potrebbero essere condivisi con:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Fornitori di servizi cloud (hosting, database) che agiscono come responsabili del trattamento</li>
              <li>Autorità competenti in caso di obbligo di legge</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-lg font-display font-bold mb-3">6. Conservazione dei dati</h2>
            <p>I dati personali sono conservati per tutta la durata dell&rsquo;account. I file caricati vengono conservati fino alla cancellazione dell&rsquo;account o alla richiesta di rimozione. I dati statistici anonimizzati possono essere conservati indefinitamente.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-display font-bold mb-3">7. Diritti dell&rsquo;interessato</h2>
            <p>L&rsquo;utente ha diritto a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Accedere ai propri dati personali</li>
              <li>Richiedere la rettifica o cancellazione</li>
              <li>Richiedere la limitazione del trattamento</li>
              <li>Opporsi al trattamento</li>
              <li>Richiedere la portabilità dei dati</li>
              <li>Revocare il consenso in qualsiasi momento</li>
            </ul>
            <p className="mt-2">Per esercitare questi diritti, contattaci a <a href="mailto:info@draphera.com" className="text-drapera-gold hover:underline">info@draphera.com</a> o utilizza la pagina <Link href="/cancellazione-dati" className="text-drapera-gold hover:underline">Cancellazione Dati</Link>.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-display font-bold mb-3">8. Cookie</h2>
            <p>La Piattaforma utilizza cookie tecnici necessari al funzionamento e cookie di sessione per l&rsquo;autenticazione. Non vengono utilizzati cookie di profilazione o tracciamento pubblicitario senza esplicito consenso.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-display font-bold mb-3">9. Modifiche alla privacy policy</h2>
            <p>Questa informativa può essere aggiornata periodicamente. La versione corrente è sempre disponibile su questa pagina.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
