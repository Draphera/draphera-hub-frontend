import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Condizioni d\'Uso — Draphera Hub',
  description: 'Termini e condizioni di utilizzo della piattaforma Draphera Hub per il technical design e la gestione di file CAD nel settore moda.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-drapera-dark">
      <div className="max-w-3xl mx-auto px-4 py-10 pt-24">
        <Link href="/" className="text-drapera-gold text-xs hover:underline mb-6 inline-block">&larr; Torna alla home</Link>
        <h1 className="section-title text-white text-3xl mb-8">Condizioni d&rsquo;Uso</h1>

        <div className="prose prose-invert prose-sm max-w-none text-gray-400 space-y-6">
          <section>
            <h2 className="text-white text-lg font-display font-bold mb-3">1. Accettazione delle condizioni</h2>
            <p>Utilizzando Draphera Hub (di seguito &ldquo;la Piattaforma&rdquo;), l&rsquo;utente accetta integralmente le presenti condizioni d&rsquo;uso. Se non si accettano queste condizioni, non utilizzare la Piattaforma.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-display font-bold mb-3">2. Descrizione del servizio</h2>
            <p>Draphera Hub è un portale tecnico per il settore moda che offre strumenti di visualizzazione CAD (HPGL, ISO, DXF), normalizzazione materiali, generazione BOM e verifiche qualità. La Piattaforma è fornita &ldquo;così com&rsquo;è&rdquo; e Draphera si riserva il diritto di modificare o sospendere il servizio in qualsiasi momento.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-display font-bold mb-3">3. Registrazione e account</h2>
            <p>Per accedere ad alcune funzionalità è richiesta la registrazione. L&rsquo;utente è responsabile della riservatezza delle proprie credenziali e di tutte le attività effettuate tramite il proprio account. È vietato creare account multipli o utilizzare l&rsquo;account altrui.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-display font-bold mb-3">4. Utilizzo consentito</h2>
            <p>L&rsquo;utente si impegna a utilizzare la Piattaforma solo per scopi leciti e conformi alle normative vigenti. È espressamente vietato:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Caricare file contenenti malware o codice dannoso</li>
              <li>Tentare di accedere a dati altrui o a risorse non autorizzate</li>
              <li>Utilizzare la Piattaforma per attività illecite o fraudolente</li>
              <li>Riprodurre, distribuire o modificare i contenuti della Piattaforma senza autorizzazione</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-lg font-display font-bold mb-3">5. Proprietà intellettuale</h2>
            <p>I file caricati dall&rsquo;utente rimangono di sua proprietà. Draphera non acquisisce alcun diritto sui contenuti caricati, limitandosi a fornire gli strumenti di visualizzazione e analisi. Il software, il design e i contenuti originali della Piattaforma sono protetti da copyright e diritti di proprietà intellettuale di Draphera.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-display font-bold mb-3">6. Limitazione di responsabilità</h2>
            <p>Draphera non sarà responsabile per danni diretti o indiretti derivanti dall&rsquo;uso della Piattaforma, inclusi ma non limitati a perdita di dati, interruzione del servizio o danni consequenziali. I file caricati vengono elaborati temporaneamente e Draphera non garantisce la conservazione permanente dei dati.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-display font-bold mb-3">7. Modifiche alle condizioni</h2>
            <p>Draphera si riserva il diritto di modificare queste condizioni in qualsiasi momento. Le modifiche saranno comunicate tramite la Piattaforma. L&rsquo;uso continuato dopo le modifiche costituisce accettazione delle nuove condizioni.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-display font-bold mb-3">8. Contatti</h2>
            <p>Per qualsiasi domanda relativa a queste condizioni, contattaci all&rsquo;indirizzo email: <a href="mailto:info@draphera.com" className="text-drapera-gold hover:underline">info@draphera.com</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
