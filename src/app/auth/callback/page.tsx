'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );
      if (error) {
        router.push('/auth/signin?error=auth_callback_error');
      } else {
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next') || '/dashboard';
        router.push(next);
      }
    };
    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-drapera-steel-light">Completamento accesso...</div>
    </div>
  );
}
