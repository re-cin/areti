import { useEffect, useRef } from 'react';
import { supabase, supabaseConfigured } from './supabase';

/**
 * Calls `onChange` whenever a row in public.subscriptions changes in Supabase: a payment in the app,
 * a cancel or resume, the automatic renewal (renew_due_subscriptions), or another admin's edit.
 * Admins can read every row (RLS), so Realtime delivers them all. Pass `userId` to watch one user.
 * Also re-checks when the browser tab comes back into view, in case the connection dropped.
 */
export function useLiveSubscriptions(onChange: () => void, userId?: string) {
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Several changes can arrive together (e.g. the renew job); reload once.
    const fire = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => latest.current(), 300);
    };

    const channel = supabase
      .channel(`admin-subscriptions:${userId ?? 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions', ...(userId ? { filter: `user_id=eq.${userId}` } : {}) },
        fire,
      )
      .subscribe();

    const onVisible = () => document.visibilityState === 'visible' && fire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
