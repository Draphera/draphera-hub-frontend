'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';

const providers = ['google', 'facebook', 'linkedin_oidc', 'github'] as const;
type Provider = (typeof providers)[number];

const providerIcons: Record<Provider, JSX.Element> = {
  google: <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>,
  facebook: <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#fff" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  linkedin_oidc: <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#fff" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  github: <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#fff" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>,
};

export default function SignUpPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError(t('auth.error_required')); return; }
    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    router.push('/dashboard');
  };

  const handleOAuth = async (provider: Provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback?next=/dashboard` },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="premium-card max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-drapera-gold to-amber-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-drapera-dark font-display font-extrabold text-lg">D</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-white">{t('auth.signup_title')}</h1>
          <p className="text-sm text-drapera-steel-light mt-1">{t('auth.signup_sub')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">{t('auth.email')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="tech-input" placeholder="mario@example.com" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">{t('auth.password')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="tech-input" placeholder="••••••••" />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button type="submit" disabled={loading} className="btn-gold w-full">
            {loading ? '...' : t('auth.signup_btn')}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-drapera-border" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-drapera-dark px-2 text-gray-500">{t('auth.or_continue')}</span></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {providers.map(p => (
            <button key={p} onClick={() => handleOAuth(p)}
              className="flex items-center justify-center gap-2 px-3 py-2.5 border border-drapera-border rounded-lg hover:bg-white/5 transition-colors text-xs text-gray-300">
              {providerIcons[p]}
              {t(`auth.${p.replace('_oidc', '')}`)}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          {t('auth.signin_link')}{' '}
          <Link href="/auth/signin" className="text-drapera-gold hover:underline">{t('auth.signin_cta')}</Link>
        </p>
      </div>
    </div>
  );
}
