import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Throwing here would crash before React mounts, producing a blank white page.
  // Log loudly instead and fall back to a placeholder so the app still renders;
  // auth/data calls fail gracefully and the sign-in screen is shown.
  console.error(
    'Missing Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
      'Set them as GitHub Actions secrets and in a local .env for sync to work.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}
