import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import { checkIsAdmin } from './api';
import { DEMO_ADMIN_ID } from './demo';
import { supabase, supabaseConfigured } from './supabase';

type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut'; notice?: string }
  | { status: 'signedIn'; userId: string; email: string; demo: boolean };

type AuthContextValue = {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Only accounts listed in public.admins get past the sign-in page. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(
    supabaseConfigured ? { status: 'loading' } : { status: 'signedIn', userId: DEMO_ADMIN_ID, email: 'demo@areti.app', demo: true },
  );

  useEffect(() => {
    if (!supabaseConfigured) return;
    const apply = async (session: Session | null) => {
      if (!session) {
        setState((s) => (s.status === 'signedOut' ? s : { status: 'signedOut' }));
        return;
      }
      try {
        if (await checkIsAdmin()) {
          setState({ status: 'signedIn', userId: session.user.id, email: session.user.email ?? '', demo: false });
        } else {
          await supabase.auth.signOut();
          setState({ status: 'signedOut', notice: 'This account is not an areti admin.' });
        }
      } catch {
        setState({ status: 'signedOut', notice: 'Could not check admin access. Is the admin migration applied?' });
      }
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') void apply(session);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    state,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signOut: async () => {
      if (!supabaseConfigured) return;
      await supabase.auth.signOut();
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
