import { createClient } from '@supabase/supabase-js';

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

const isMissingConfig =
  !supabaseUrl ||
  supabaseUrl === 'YOUR_SUPABASE_URL' ||
  !supabaseAnonKey ||
  supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY';

if (isMissingConfig) {
  const warningStyle = 'color: red; font-size: 16px; font-weight: bold;';
  console.warn('%cSupabase credentials are not set!', warningStyle);
  console.warn(
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.\n' +
    'See README.md for setup instructions.'
  );
}

let supabaseInitError: Error | null = null;
let supabaseClient: ReturnType<typeof createClient> | null = null;

try {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
  supabaseInitError = error instanceof Error ? error : new Error(String(error));
  console.error('Failed to initialize Supabase client:', supabaseInitError);
}

export const supabase = supabaseClient as ReturnType<typeof createClient>;
export { supabaseInitError };
