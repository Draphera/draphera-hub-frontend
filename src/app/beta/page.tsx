'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { userApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import Header from '@/components/Header';

export default function BetaApplyPage() {
  const { lang } = useTranslation();
  const _ = (it: string, en: string) => lang === 'en' ? en : it;
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [existingApp, setExistingApp] = useState<any>(null);

  const [form, setForm] = useState({
    full_name: '',
    role: '',
    company: '',
    experience: '',
    sector: '',
    reason: '',
    usage_plan: '',
    hear_about: '',
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (!data.session) { router.push('/auth/signin?redirect=/beta'); return; }
      try {
        const profile = await (await fetch('/api/profile', { headers: { Authorization: `Bearer ${data.session.access_token}` } })).json();
        if (profile.full_name) setForm(f => ({ ...f, full_name: profile.full_name }));
      } catch {}
      try {
        const app = await userApi.getBetaApplication();
        if (app.application) {
          setExistingApp(app.application);
          if (app.application.status === 'pending') setSubmitted(true);
        }
      } catch {}
      setLoading(false);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await userApi.submitBetaApplication(form);
      if (result.submitted) {
        setSubmitted(true);
        setExistingApp({ status: 'pending' });
      }
    } catch (err: any) {
      setError(err.message);
    }
    setSubmitting(false);
  };

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  if (loading) return (
    <div className="min-h-screen bg-drapera-dark">
      <Header />
      <div className="flex items-center justify-center pt-32"><p className="text-gray-500">{_('Caricamento...', 'Loading...')}</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-drapera-dark">
      <Header />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">

        {existingApp?.status === 'approved' ? (
          <div className="premium-card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">{_('Candidatura approvata!', 'Application approved!')}</h1>
            <p className="text-gray-500 text-sm mb-6">{_('Sei ora un Beta Tester di Draphera. Benvenuto a bordo!', 'You are now a Draphera Beta Tester. Welcome aboard!')}</p>
            <button onClick={() => router.push('/dashboard')} className="btn-gold text-sm px-6 py-2.5">{_('Vai alla dashboard', 'Go to dashboard')}</button>
          </div>
        ) : submitted ? (
          <div className="premium-card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">{_('Candidatura inviata!', 'Application submitted!')}</h1>
            <p className="text-gray-500 text-sm mb-6">{_('La tua candidatura è in fase di revisione. Ti contatteremo via email.', 'Your application is under review. We will contact you via email.')}</p>
            <button onClick={() => router.push('/dashboard')} className="btn-gold text-sm px-6 py-2.5">{_('Vai alla dashboard', 'Go to dashboard')}</button>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-white mb-3">{_('Candidati come Beta Tester', 'Apply as Beta Tester')}</h1>
              <p className="text-gray-500 max-w-lg mx-auto">{_('Compila il modulo per candidarti al programma Beta di Draphera. Cerchiamo professionisti del settore moda, sviluppatori e appassionati per testare VectorEngine e guidare lo sviluppo della piattaforma.', 'Fill out the form to apply for the Draphera Beta program. We are looking for fashion industry professionals, developers and enthusiasts to test VectorEngine and guide the platform development.')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">{_('Nome e Cognome', 'Full Name')}</label>
                <input type="text" value={form.full_name} onChange={e => update('full_name', e.target.value)}
                  className="w-full bg-drapera-darker border border-drapera-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-drapera-gold/50" />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5">{_('Che ruolo ricopri?', 'What is your role?')} *</label>
                <select value={form.role} onChange={e => update('role', e.target.value)}
                  className="w-full bg-drapera-darker border border-drapera-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-drapera-gold/50">
                  <option value="">{_('Seleziona...', 'Select...')}</option>
                  <option value="modellista">{_('Modellista / Pattern Maker', 'Pattern Maker')}</option>
                  <option value="sviluppatore">{_('Sviluppatore / Developer', 'Developer')}</option>
                  <option value="produzione">{_('Responsabile Produzione', 'Production Manager')}</option>
                  <option value="studente">{_('Studente / Student', 'Student')}</option>
                  <option value="hobbista">{_('Hobbista / Hobbyist', 'Hobbyist')}</option>
                  <option value="altro">{_('Altro', 'Other')}</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5">{_('Azienda / Libero professionista', 'Company / Freelance')}</label>
                <input type="text" value={form.company} onChange={e => update('company', e.target.value)}
                  placeholder={_('Es. Nome azienda o "Libero professionista"', 'E.g. Company name or "Freelance"')}
                  className="w-full bg-drapera-darker border border-drapera-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-drapera-gold/50" />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5">{_('Anni di esperienza nel settore', 'Years of experience in the industry')} *</label>
                <select value={form.experience} onChange={e => update('experience', e.target.value)}
                  className="w-full bg-drapera-darker border border-drapera-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-drapera-gold/50">
                  <option value="">{_('Seleziona...', 'Select...')}</option>
                  <option value="0-1">{_('Meno di 1 anno', 'Less than 1 year')}</option>
                  <option value="1-3">1-3 {_('anni', 'years')}</option>
                  <option value="3-5">3-5 {_('anni', 'years')}</option>
                  <option value="5-10">5-10 {_('anni', 'years')}</option>
                  <option value="10+">10+ {_('anni', 'years')}</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5">{_('Settore di appartenenza', 'Industry sector')} *</label>
                <select value={form.sector} onChange={e => update('sector', e.target.value)}
                  className="w-full bg-drapera-darker border border-drapera-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-drapera-gold/50">
                  <option value="">{_('Seleziona...', 'Select...')}</option>
                  <option value="abbigliamento">{_('Abbigliamento / Fashion', 'Fashion / Apparel')}</option>
                  <option value="calzatura">{_('Calzatura / Footwear', 'Footwear')}</option>
                  <option value="automotive">{_('Automotive / Trasporti', 'Automotive')}</option>
                  <option value="arredamento">{_('Arredamento / Interior', 'Furniture / Interior')}</option>
                  <option value="tecnico">{_('Tessile Tecnico / Technical Textiles', 'Technical Textiles')}</option>
                  <option value="software">{_('Software / IT', 'Software / IT')}</option>
                  <option value="ricerca">{_('Ricerca / Formazione', 'Research / Education')}</option>
                  <option value="altro">{_('Altro', 'Other')}</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5">{_('Perché vuoi partecipare al programma Beta?', 'Why do you want to join the Beta program?')} *</label>
                <textarea value={form.reason} onChange={e => update('reason', e.target.value)} rows={3}
                  placeholder={_('Raccontaci cosa ti aspetti da Draphera e perché sei la persona giusta...', 'Tell us what you expect from Draphera and why you are the right person...')}
                  className="w-full bg-drapera-darker border border-drapera-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-drapera-gold/50 resize-none" />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5">{_('Come pensi di utilizzare la piattaforma?', 'How do you plan to use the platform?')} *</label>
                <textarea value={form.usage_plan} onChange={e => update('usage_plan', e.target.value)} rows={3}
                  placeholder={_('Es. Analisi marcature HPGL, controllo qualità, integrazione ERP...', 'E.g. HPGL marker analysis, quality control, ERP integration...')}
                  className="w-full bg-drapera-darker border border-drapera-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-drapera-gold/50 resize-none" />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5">{_('Come hai conosciuto Draphera?', 'How did you hear about Draphera?')}</label>
                <input type="text" value={form.hear_about} onChange={e => update('hear_about', e.target.value)}
                  placeholder={_('Es. LinkedIn, passaparola, conference...', 'E.g. LinkedIn, word of mouth, conference...')}
                  className="w-full bg-drapera-darker border border-drapera-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-drapera-gold/50" />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button type="submit" disabled={submitting}
                className="w-full btn-gold text-sm px-6 py-3 disabled:opacity-50">
                {submitting ? _('Invio in corso...', 'Submitting...') : _('Invia candidatura', 'Submit application')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
