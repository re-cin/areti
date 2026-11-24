
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { profileQuery } from '@/db/queries/profile';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { usePreferences } from '@/features/preferences/preferencesStore';

export type CurrentUser = {
  id: string;
  email: string;
  /** Name from the profile; until one is set, the part of the email before "@". */
  name: string;
  /** True once the user has set their own name. */
  hasCustomName: boolean;
  /** Profile picture link, or null for the default person icon. */
  pictureUri: string | null;
  /** e.g. "Joined November 2026" */
  joined: string;
};

const formatJoinedDate = (dateString: string, format: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  switch (format) {
    case 'mm/dd/yy':
      return `${month}/${day}/${String(year).slice(-2)}`;
    case 'yyyy-mm-dd':
      return `${year}-${month}-${day}`;
    case 'dd/mm/yy':
    default:
      return `${day}/${month}/${String(year).slice(-2)}`;
  }
};

/** The signed-in user with their profile (updates live on sign in/out and profile edits), or null. */
export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<User | null>(null);
  const dateFormat = usePreferences(s => s.preferences.dateFormat);

  useEffect(() => {
    if (!supabaseConfigured) return;

    supabase.auth.getSession().then(({ data }) =>
      setUser(data.session?.user ?? null),
    );

    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );

    return () => data.subscription.unsubscribe();
  }, []);

  const { data: rows } = useLiveQuery(
    profileQuery(user?.id ?? ''),
    [user?.id],
  );
  const row = rows?.[0];

  if (!user?.email) return null;

  const displayName = row?.displayName?.trim() ?? '';

  return {
    id: user.id,
    email: user.email,
    name: displayName || user.email.split('@')[0],
    hasCustomName: displayName.length > 0,
    pictureUri: row?.pictureUri ?? null,
    joined: `Joined ${formatJoinedDate(user.created_at, dateFormat)}`,
  };
}
