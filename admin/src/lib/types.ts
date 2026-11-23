export type Plan = 'free' | 'premium';
export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'expired';
export type BillingPeriod = 'weekly' | 'monthly' | 'yearly';

/** One row of public.admin_list_users(). */
export type AdminUser = {
  id: string;
  email: string;
  display_name: string | null;
  picture_uri: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  plan: Plan;
  subscription_status: SubscriptionStatus;
  billing_period: BillingPeriod | null;
  current_period_end: string | null;
  focus_minutes: number;
  sessions_count: number;
  /** Epoch ms, like the app's focus_sessions.started_at. */
  last_focus_at: number | null;
  is_admin: boolean;
  /** Banned in Supabase Auth: cannot sign in. */
  disabled: boolean;
};

export type DailyPoint = { day: string; signups: number; focus_minutes: number };

/** Result of public.admin_dashboard_stats(). */
export type DashboardStats = {
  total_users: number;
  new_users_7d: number;
  active_users_7d: number;
  premium_users: number;
  focus_minutes_total: number;
  focus_minutes_7d: number;
  sessions_completed_7d: number;
  plans: { free: number; premium: number };
  daily: DailyPoint[];
  recent_signups: { id: string; email: string; created_at: string; display_name: string | null }[];
};

export type SubscriptionChange = {
  plan: Plan;
  status: SubscriptionStatus;
  billing_period: BillingPeriod | null;
  current_period_end: string | null;
};

/** A subscription only counts as Premium while it is active or trialing. */
export function isPremium(u: Pick<AdminUser, 'plan' | 'subscription_status'>) {
  return u.plan === 'premium' && (u.subscription_status === 'active' || u.subscription_status === 'trialing');
}

/** Result of public.admin_user_detail(). */
export type UserDetail = {
  user: {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
    email_confirmed: boolean;
    disabled: boolean;
    display_name: string | null;
    picture_uri: string | null;
    is_admin: boolean;
  };
  subscription: {
    plan: Plan;
    status: SubscriptionStatus;
    billing_period: BillingPeriod | null;
    started_at: string | null;
    current_period_end: string | null;
  };
  ghost: { name: string; level: number; xp: number } | null;
  subjects: { id: string; name: string; color: string; deleted: boolean }[];
  /** Every focus session, oldest first. started_at is epoch ms. */
  sessions: { started_at: number; duration_sec: number; completed: boolean; subject_id: string | null }[];
  tasks: { total: number; done: number; overdue: number };
  exams: { subject_id: string; exam_date: number; status: string }[];
};

export const BILLING_LABEL: Record<BillingPeriod, string> = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

export type MusicKind = 'background' | 'notification';

/** A row of public.app_music, plus the file's public link. */
export type Music = {
  id: string;
  title: string;
  kind: MusicKind;
  file_path: string;
  enabled: boolean;
  created_at: string;
  url: string;
};
