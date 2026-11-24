import type { AdminUser, DashboardStats, SubscriptionChange, UserDetail } from './types';
import { isPremium } from './types';

// Sample data so the site can be opened without a Supabase project (demo mode).

const NAMES = [
  'Rin Santos', 'Ryan Cruz', 'Mika Reyes', 'Jules Tan', 'Ana Lim', 'Paolo Garcia', 'Bea Mendoza', 'Carlo Dizon',
  'Lia Navarro', 'Miguel Ramos', 'Sofia Bautista', 'Nico Villanueva', 'Ella Aquino', 'Theo Castillo', 'Kat Flores',
  'Gab Torres', 'Iris Domingo', 'Leo Pascual', 'Maya Ocampo', 'Sam Rivera', '', 'Zoe Hernandez', 'Ivan Morales', '',
];

const DAY = 86_400_000;
const now = Date.now();

function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

let users: AdminUser[] = NAMES.map((name, i) => {
  const created = now - Math.floor(rand(i + 1) * 60 * DAY) - i * 3600_000;
  const premiumRoll = rand(i + 7);
  const plan = premiumRoll > 0.68 ? 'premium' : 'free';
  const status = plan === 'free' ? 'active' : premiumRoll > 0.95 ? 'canceled' : premiumRoll > 0.9 ? 'trialing' : 'active';
  const sessions = Math.floor(rand(i + 3) * 80);
  const handle = name ? name.toLowerCase().replace(' ', '.') : `student${i}`;
  return {
    id: `demo-${i}`,
    email: `${handle}@example.com`,
    display_name: name || null,
    picture_uri: null,
    created_at: new Date(created).toISOString(),
    last_sign_in_at: new Date(Math.max(created, now - Math.floor(rand(i + 11) * 10 * DAY))).toISOString(),
    email_confirmed: rand(i + 5) > 0.15,
    plan,
    subscription_status: status,
    billing_period: plan === 'premium' ? (['weekly', 'monthly', 'monthly', 'yearly'] as const)[i % 4] : null,
    current_period_end: plan === 'premium' ? new Date(now + Math.floor(rand(i + 13) * 30 * DAY)).toISOString() : null,
    focus_minutes: sessions * 25,
    sessions_count: sessions,
    last_focus_at: sessions ? Math.max(created, now - Math.floor(rand(i + 17) * 9 * DAY)) : null,
    is_admin: i === 0,
    disabled: i === 6,
  } satisfies AdminUser;
});

export async function demoListUsers(): Promise<AdminUser[]> {
  return [...users].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function demoSetSubscription(userId: string, change: SubscriptionChange) {
  users = users.map((u) =>
    u.id === userId
      ? { ...u, plan: change.plan, subscription_status: change.status, billing_period: change.billing_period, current_period_end: change.current_period_end }
      : u,
  );
}

export async function demoDashboardStats(days = 14): Promise<DashboardStats> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date(start.getTime() - (days - 1 - i) * DAY);
    const dayStart = d.getTime();
    return {
      day: d.toISOString().slice(0, 10),
      signups: users.filter((u) => {
        const t = Date.parse(u.created_at);
        return t >= dayStart && t < dayStart + DAY;
      }).length,
      focus_minutes: Math.round(120 + rand(i + 31) * 420 + i * 18),
    };
  });
  const premium = users.filter(isPremium).length;
  const week = now - 7 * DAY;
  return {
    total_users: users.length,
    new_users_7d: users.filter((u) => Date.parse(u.created_at) >= week).length,
    active_users_7d: users.filter((u) => (u.last_focus_at ?? 0) >= week).length,
    premium_users: premium,
    focus_minutes_total: users.reduce((s, u) => s + u.focus_minutes, 0),
    focus_minutes_7d: daily.slice(-7).reduce((s, d) => s + d.focus_minutes, 0),
    sessions_completed_7d: Math.round(daily.slice(-7).reduce((s, d) => s + d.focus_minutes, 0) / 25),
    plans: { free: users.length - premium, premium },
    daily,
    recent_signups: (await demoListUsers()).slice(0, 5).map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      display_name: u.display_name,
    })),
  };
}

const DEMO_SUBJECTS = [
  { id: 's1', name: 'Physics', color: '#7B4FD6', deleted: false },
  { id: 's2', name: 'Calculus', color: '#B3261E', deleted: false },
  { id: 's3', name: 'Biology', color: '#2E7D4F', deleted: false },
  { id: 's4', name: 'Chemistry', color: '#1F6F6A', deleted: false },
];

export async function demoUserDetail(userId: string): Promise<UserDetail | null> {
  const u = users.find((x) => x.id === userId);
  if (!u) return null;
  const seed = Number(userId.replace(/\D/g, '')) || 1;
  const sessions: UserDetail['sessions'] = [];
  const created = Date.parse(u.created_at);
  for (let i = 0; i < u.sessions_count; i++) {
    const daysAgo = Math.floor(rand(seed * 31 + i) * Math.min(60, (now - created) / DAY));
    const day = new Date(now - daysAgo * DAY);
    day.setHours(8 + Math.floor(rand(seed + i * 7) * 12), Math.floor(rand(seed + i) * 60), 0, 0);
    sessions.push({
      started_at: Math.min(day.getTime(), now - 3600_000),
      duration_sec: [25, 25, 25, 50, 15][i % 5] * 60,
      completed: rand(seed + i * 3) > 0.15,
      subject_id: rand(seed + i * 5) > 0.1 ? DEMO_SUBJECTS[Math.floor(rand(seed + i * 11) * 4)].id : null,
    });
  }
  sessions.sort((a, b) => a.started_at - b.started_at);
  let xp = Math.round(sessions.reduce((a, s) => a + s.duration_sec / 60, 0));
  let level = 1;
  while (xp >= 100 * (level + 1)) { xp -= 100 * (level + 1); level += 1; }
  return {
    user: {
      id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at,
      email_confirmed: u.email_confirmed, disabled: u.disabled, display_name: u.display_name, picture_uri: u.picture_uri, is_admin: u.is_admin,
    },
    subscription: {
      plan: u.plan, status: u.subscription_status, billing_period: u.billing_period,
      started_at: u.plan === 'premium' ? new Date(now - 20 * DAY).toISOString() : null,
      current_period_end: u.current_period_end,
    },
    ghost: { name: 'Reti', level, xp },
    subjects: DEMO_SUBJECTS,
    sessions,
    tasks: { total: 12 + (seed % 9), done: 7 + (seed % 5), overdue: seed % 3 },
    exams: [
      { subject_id: 's1', exam_date: now + 9 * DAY, status: 'active' },
      { subject_id: 's2', exam_date: now + 23 * DAY, status: 'active' },
    ],
  };
}

/** The signed-in admin in demo mode (Rin Santos). */
export const DEMO_ADMIN_ID = 'demo-0';

export async function demoSetAdmin(userId: string, makeAdmin: boolean) {
  if (!makeAdmin && userId === DEMO_ADMIN_ID) throw new Error('You cannot remove your own admin access');
  users = users.map((u) => (u.id === userId ? { ...u, is_admin: makeAdmin } : u));
}

export async function demoSetDisabled(userId: string, disabled: boolean) {
  if (userId === DEMO_ADMIN_ID) throw new Error('You cannot disable your own account');
  users = users.map((u) => (u.id === userId ? { ...u, disabled } : u));
}

export async function demoDeleteUser(userId: string) {
  if (userId === DEMO_ADMIN_ID) throw new Error('You cannot delete your own account here');
  users = users.filter((u) => u.id !== userId);
}
