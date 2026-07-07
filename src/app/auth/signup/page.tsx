'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';

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

        <p className="text-xs text-gray-500 text-center mt-6">
          {t('auth.signin_link')}{' '}
          <Link href="/auth/signin" className="text-drapera-gold hover:underline">{t('auth.signin_cta')}</Link>
        </p>
      </div>
    </div>
  );
}
