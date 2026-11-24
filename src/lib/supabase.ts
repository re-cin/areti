import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { deviceStorage } from './storage';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** False until .env has the project URL and key (see .env.example). */
export const supabaseConfigured = Boolean(url && anonKey);

/**
 * Supabase client. The sign-in session is kept in expo-sqlite's key-value store, so the
 * user stays signed in across app restarts (and while offline).
 */
export const supabase = createClient(url ?? 'https://not-configured.supabase.co', anonKey ?? 'not-configured', {
  auth: {
    storage: deviceStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh the session token only while the app is open (Supabase's recommended setup for React Native).
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
