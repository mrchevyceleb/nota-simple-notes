import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace with your Supabase project's URL and anon key.
// You can find these in your Supabase project settings under "API".
// FIX: Explicitly type as string to prevent TypeScript from inferring a literal type, which causes comparison errors below.
const supabaseUrl: string = 'https://jsekwdnukmrwbfcaabac.supabase.co';
// FIX: Explicitly type as string to prevent TypeScript from inferring a literal type, which causes comparison errors below.
const supabaseAnonKey: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzZWt3ZG51a21yd2JmY2FhYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2OTIzNzgsImV4cCI6MjA3MzI2ODM3OH0.gA7axyXt0_aiNRRmPYkhA08q9HntsxO9FMtPYy3Ggcs';

if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL' || !supabaseAnonKey || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
    const warningStyle = 'color: red; font-size: 16px; font-weight: bold;';
    console.warn('%cSupabase credentials are not set!', warningStyle);
    console.warn('Please open `supabaseClient.ts` and replace the placeholder values with your actual Supabase URL and anon key.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);