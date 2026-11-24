import { demoAddTestFocus, demoDashboardStats, demoDeleteUser, demoListUsers, demoRemoveTestFocus, demoRetiDetail, demoSetAdmin, demoSetDisabled, demoSetSubscription, demoUserDetail } from './demo';
import type { RetiDetail, TestBlock } from './reti';
import { supabase, supabaseConfigured } from './supabase';
import type { AdminUser, DashboardStats, SubscriptionChange, UserDetail } from './types';

// Every call goes through the admin_* database functions
// (supabase/migrations/20261123120000_admin_and_subscriptions.sql), which refuse non-admins.

export async function fetchDashboardStats(days = 14): Promise<DashboardStats> {
  if (!supabaseConfigured) return demoDashboardStats(days);
  const { data, error } = await supabase.rpc('admin_dashboard_stats', { p_days: days });
  if (error) throw error;
  return data as DashboardStats;
}

export async function fetchUsers(): Promise<AdminUser[]> {
  if (!supabaseConfigured) return demoListUsers();
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw error;
  return (data ?? []) as AdminUser[];
}

export async function updateSubscription(userId: string, change: SubscriptionChange) {
  if (!supabaseConfigured) return demoSetSubscription(userId, change);
  const { error } = await supabase.rpc('admin_set_subscription', {
    p_user_id: userId,
    p_plan: change.plan,
    p_status: change.status,
    p_current_period_end: change.current_period_end,
    p_billing_period: change.billing_period,
  });
  if (error) throw error;
}

export async function checkIsAdmin(): Promise<boolean> {
  if (!supabaseConfigured) return true;
  const { data, error } = await supabase.rpc('is_admin');
  if (error) throw error;
  return Boolean(data);
}

/** One user's own statistics, or null if the user no longer exists. */
export async function fetchUserDetail(userId: string): Promise<UserDetail | null> {
  if (!supabaseConfigured) return demoUserDetail(userId);
  const { data, error } = await supabase.rpc('admin_user_detail', { p_user_id: userId });
  if (error) throw error;
  return (data ?? null) as UserDetail | null;
}

/** Give or take away admin access. You cannot remove your own. */
export async function setAdmin(userId: string, makeAdmin: boolean) {
  if (!supabaseConfigured) return demoSetAdmin(userId, makeAdmin);
  const { error } = await supabase.rpc('admin_set_admin', { p_user_id: userId, p_make_admin: makeAdmin });
  if (error) throw error;
}

/** Disable (ban, and sign out everywhere) or re-enable an account. */
export async function setDisabled(userId: string, disabled: boolean) {
  if (!supabaseConfigured) return demoSetDisabled(userId, disabled);
  const { error } = await supabase.rpc('admin_set_disabled', { p_user_id: userId, p_disabled: disabled });
  if (error) throw error;
}

/** Permanently delete an account: its profile picture file, then the account and all its data. */
export async function deleteUser(userId: string) {
  if (!supabaseConfigured) return demoDeleteUser(userId);
  const { data: files } = await supabase.storage.from('avatars').list(userId);
  if (files?.length) await supabase.storage.from('avatars').remove(files.map((f) => `${userId}/${f.name}`));
  const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userId });
  if (error) throw error;
}

// ---- Reti page (supabase/migrations/20261124120000_admin_reti_tools.sql) ----

/** One user's ghost, daily goal and focus log (null if the user no longer exists). */
export async function fetchRetiDetail(userId: string): Promise<RetiDetail | null> {
  if (!supabaseConfigured) return demoRetiDetail(userId);
  const { data, error } = await supabase.rpc('admin_reti_detail', { p_user_id: userId });
  if (error) throw error;
  return (data ?? null) as RetiDetail | null;
}

/** Adds test focus blocks (marked as test data) to a user's focus log. The phone gets them at its next sync. */
export async function addTestFocus(userId: string, blocks: TestBlock[]) {
  for (const b of blocks) {
    if (!supabaseConfigured) { await demoAddTestFocus(userId, b); continue; }
    const { error } = await supabase.rpc('admin_add_test_focus', {
      p_user_id: userId, p_started_at: Math.round(b.started_at), p_duration_sec: b.duration_sec, p_completed: b.completed,
    });
    if (error) throw error;
  }
}

/** Removes only the test blocks; real study stays. Returns how many were removed. */
export async function removeTestFocus(userId: string): Promise<number> {
  if (!supabaseConfigured) return demoRemoveTestFocus(userId);
  const { data, error } = await supabase.rpc('admin_remove_test_focus', { p_user_id: userId });
  if (error) throw error;
  return Number(data ?? 0);
}
