import { createClient } from '@supabase/supabase-js';

// Either name works: VITE_SUPABASE_* or the app's EXPO_PUBLIC_SUPABASE_*.
const env = import.meta.env;
const url = (env.VITE_SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL) as string | undefined;
const anonKey = (env.VITE_SUPABASE_ANON_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY) as string | undefined;

/** False until admin/.env has the project URL and key. The site then runs in demo mode. */
export const supabaseConfigured = Boolean(url && anonKey && !url.includes('YOUR-PROJECT'));

export const supabase = createClient(url ?? 'https://not-configured.supabase.co', anonKey ?? 'not-configured', {
  // Keep the admin session in its own storage key so it never mixes with anything else.
  auth: { storageKey: 'areti-admin-auth', persistSession: true, autoRefreshToken: true },
});
