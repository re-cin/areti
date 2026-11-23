import { demoDashboardStats, demoDeleteUser, demoListUsers, demoSetAdmin, demoSetDisabled, demoSetSubscription, demoUserDetail } from './demo';
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
