import { db } from '@/db/client';
import { settings } from '@/db/schema';
import { regenerateSchedules } from '@/features/planner/examsRepo';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { bumpData } from '@/stores/dataVersion';
import { eq } from 'drizzle-orm';
import { SUBSCRIPTION_SETTING_KEY, parseSubscription, recordFromRow, type SubscriptionRecord } from './entitlements';

/**
 * Copies the student's plan from Supabase into a local cache so scheduling works offline.
 * The server row is the authority and students cannot write it (see the subscriptions migration).
 * Offline or on any error the previous cache is kept; a student is never downgraded by a failed request.
 */
export async function refreshSubscription(): Promise<void> {
  if (!supabaseConfigured) return;
  const { data: auth } = await supabase.auth.getSession();
  const userId = auth.session?.user.id;
  if (!userId) return;
  const { data, error } = await supabase.from('subscriptions').select('plan, status, current_period_end').eq('user_id', userId).maybeSingle();
  if (error) return;
  const next: SubscriptionRecord = recordFromRow(data);
  const value = JSON.stringify(next);
  const current = db.select().from(settings).where(eq(settings.key, SUBSCRIPTION_SETTING_KEY)).get();
  if (current && JSON.stringify(parseSubscription(current.value)) === value) return;
  const now = Date.now();
  db.insert(settings).values({ key: SUBSCRIPTION_SETTING_KEY, value, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } }).run();
  // A plan change switches scheduling capabilities on or off straight away.
  await regenerateSchedules().catch(error => console.warn('[subscription] Could not refresh schedules', error));
  bumpData();
}
