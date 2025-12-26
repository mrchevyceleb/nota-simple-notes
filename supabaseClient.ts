import { createClient } from '@supabase/supabase-js';

const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const envSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Default to the linked project values but allow overriding via env for local/testing.
const supabaseUrl: string = envSupabaseUrl || 'https://jsekwdnukmrwbfcaabac.supabase.co';
const supabaseAnonKey: string = envSupabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzZWt3ZG51a21yd2JmY2FhYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2OTIzNzgsImV4cCI6MjA3MzI2ODM3OH0.gA7axyXt0_aiNRRmPYkhA08q9HntsxO9FMtPYy3Ggcs';

const isMissingConfig =
  !supabaseUrl ||
  supabaseUrl === 'YOUR_SUPABASE_URL' ||
  !supabaseAnonKey ||
  supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY';

if (isMissingConfig) {
    const warningStyle = 'color: red; font-size: 16px; font-weight: bold;';
    console.warn('%cSupabase credentials are not set!', warningStyle);
    console.warn('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or update `supabaseClient.ts` with valid values.');
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