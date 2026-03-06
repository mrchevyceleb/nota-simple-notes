import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isMissingConfig = !supabaseUrl || !supabaseAnonKey;

let supabaseInitError: Error | null = null;
let supabaseClient: ReturnType<typeof createClient> | null = null;

if (isMissingConfig) {
  supabaseInitError = new Error(
    'Supabase credentials are not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
  );
  console.error(supabaseInitError.message);
} else {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    supabaseInitError = error instanceof Error ? error : new Error(String(error));
    console.error('Failed to initialize Supabase client:', supabaseInitError);
  }
}

export const supabase = supabaseClient as ReturnType<typeof createClient>;
export { supabaseInitError };
