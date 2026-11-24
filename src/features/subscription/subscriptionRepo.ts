import { db } from '@/db/client';
import { settings } from '@/db/schema';
import { regenerateSchedules } from '@/features/planner/examsRepo';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { bumpData } from '@/stores/dataVersion';
import { eq } from 'drizzle-orm';
import { showNotice } from '@/stores/notice';
import { SUBSCRIPTION_SETTING_KEY, parseSubscription, recordFromRow, renewedTo, type SubscriptionRecord } from './entitlements';
import { premiumDateTimeText } from './premiumInfo';

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
  const { data, error } = await supabase.from('subscriptions').select('plan, status, current_period_end, billing_period').eq('user_id', userId).maybeSingle();
  if (error) return;
  const next: SubscriptionRecord = recordFromRow(data);
  const value = JSON.stringify(next);
  const current = db.select().from(settings).where(eq(settings.key, SUBSCRIPTION_SETTING_KEY)).get();
  const previous = current ? parseSubscription(current.value) : null;
  if (current && JSON.stringify(previous) === value) return;
  const now = Date.now();
  // The server renewed it at the due time (public.renew_due_subscriptions): tell the student.
  const renewedUntil = renewedTo(previous, next, now);
  if (renewedUntil !== null) {
    showNotice({
      title: 'Premium renewed',
      message: `Your subscription renewed automatically. Next renewal: ${premiumDateTimeText(renewedUntil)}.`,
      icon: 'crown',
      buttonLabel: 'OK',
    });
  }
  db.insert(settings).values({ key: SUBSCRIPTION_SETTING_KEY, value, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } }).run();
  bumpData(); // screens (Premium card, Subscription page) update now, not after the schedules below
  // A plan change switches scheduling capabilities on or off straight away.
  await regenerateSchedules().catch(error => console.warn('[subscription] Could not refresh schedules', error));
  bumpData();
}

/**
 * Cancels the signed-in student's Premium (public.cancel_my_subscription). Premium stays until its
 * due time, then ends. Returns false if there was nothing to cancel. Throws when offline or on error.
 */
export async function cancelSubscription(): Promise<boolean> {
  return changeSubscription('cancel_my_subscription');
}

/** Undoes a cancel before the due time (public.resume_my_subscription). */
export async function resumeSubscription(): Promise<boolean> {
  return changeSubscription('resume_my_subscription');
}

async function changeSubscription(fn: 'cancel_my_subscription' | 'resume_my_subscription'): Promise<boolean> {
  if (!supabaseConfigured) throw new Error('Not connected to the cloud.');
  const { data, error } = await supabase.rpc(fn);
  if (error) throw new Error(error.message);
  await refreshSubscription(); // Realtime also brings it, this just makes it instant
  return data === true;
}
