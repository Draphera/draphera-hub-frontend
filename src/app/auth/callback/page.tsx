'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { profileApi } from '@/lib/api';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );
      if (error) {
        router.push('/auth/signin?error=auth_callback_error');
        return;
      }
      try {
        const profile = await profileApi.get();
        if (!profile.office) {
          router.push('/onboarding/office');
          return;
        }
      } catch {}
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next') || '/dashboard';
      router.push(next);
    };
    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-drapera-steel-light">Completamento accesso...</div>
    </div>
  );
}
