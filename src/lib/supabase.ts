import { createClient } from '@supabase/supabase-js';
import { BrowserCookieAuthStorageAdapter, DEFAULT_COOKIE_OPTIONS } from '@supabase/auth-helpers-shared';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      storage: new BrowserCookieAuthStorageAdapter(DEFAULT_COOKIE_OPTIONS),
      autoRefreshToken: true,
      persistSession: true,
    },
  },
);
