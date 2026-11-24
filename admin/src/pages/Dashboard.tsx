import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { BarChart } from '../components/BarChart';
import { Icon, type IconName } from '../components/Icon';
import { fetchDashboardStats } from '../lib/api';
import { formatMinutes, formatNumber, timeAgo } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useLiveSubscriptions } from '../lib/useLiveSubscriptions';

function StatCard({ icon, color, label, value, hint }: {
  icon: IconName; color: string; label: string; value: string; hint: React.ReactNode;
}) {
  return (
    <div className="neo stat">
      <div className="top">
        <span className="label">{label}</span>
        <span className="bubble" style={{ background: color }}>
          <Icon name={icon} size={20} color={icon === 'crown' ? 'var(--gold)' : 'var(--ink)'} strokeWidth={icon === 'crown' ? 1.5 : 2} />
        </span>
      </div>
      <div className="value">{value}</div>
      <div className="hint">{hint}</div>
    </div>
  );
}

export function Dashboard() {
  const [days, setDays] = useState<7 | 14 | 30>(14);
  const [metric, setMetric] = useState<'focus_minutes' | 'signups'>('focus_minutes');
  const { data, error, loading, reload } = useAsync(() => fetchDashboardStats(days), [days]);
  useLiveSubscriptions(reload); // Premium counts follow Supabase live

  const premiumShare = data && data.total_users ? Math.round((data.plans.premium / data.total_users) * 100) : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>How areti is doing today.</p>
        </div>
        <button className="btn btn-cream btn-sm" onClick={reload} disabled={loading}>
          <Icon name="sync" size={15} /> Refresh
        </button>
      </div>

      {error && <div className="neo card error" style={{ marginBottom: 18 }}>Could not load the dashboard: {error}</div>}
      {!data && loading && <div className="center" style={{ minHeight: 300 }}><div className="spinner" /></div>}

      {data && (
        <>
          <div className="stats">
            <StatCard icon="users" color="var(--teal)" label="Total users" value={formatNumber(data.total_users)}
              hint={<><b>+{data.new_users_7d}</b> joined this week</>} />
            <StatCard icon="activity" color="var(--tealSoft)" label="Active this week" value={formatNumber(data.active_users_7d)}
              hint="Studied at least once in 7 days" />
            <StatCard icon="crown" color="var(--premium)" label="Premium" value={formatNumber(data.premium_users)}
              hint={<><b>{premiumShare}%</b> of all users</>} />
            <StatCard icon="clock" color="var(--terracottaSoft)" label="Focus this week" value={formatMinutes(data.focus_minutes_7d)}
              hint={<><b>{formatNumber(data.sessions_completed_7d)}</b> sessions completed</>} />
          </div>

          <div className="grid-2">
            <div className="neo card">
              <div className="card-head">
                <div>
                  <h2>{metric === 'focus_minutes' ? 'Focus time' : 'New sign-ups'}</h2>
                  <div className="sub">Last {days} days, all users</div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <div className="seg">
                    <button className={metric === 'focus_minutes' ? 'on' : ''} onClick={() => setMetric('focus_minutes')}>Focus</button>
                    <button className={metric === 'signups' ? 'on' : ''} onClick={() => setMetric('signups')}>Sign-ups</button>
                  </div>
                  <div className="seg">
                    {([7, 14, 30] as const).map((d) => (
                      <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{d}d</button>
                    ))}
                  </div>
                </div>
              </div>
              <BarChart data={data.daily} metric={metric} format={metric === 'focus_minutes' ? formatMinutes : (n) => `${n} new`} />
            </div>

            <div className="neo card">
              <div className="card-head">
                <div>
                  <h2>Subscriptions</h2>
                  <div className="sub">Free vs Premium</div>
                </div>
                <Link to="/users?show=premium" className="btn btn-sm btn-peach" style={{ textDecoration: 'none' }}>View</Link>
              </div>
              <div className="split">
                <div style={{ width: `${100 - premiumShare}%`, background: 'var(--tealSoft)' }} />
                <div style={{ width: `${premiumShare}%`, background: 'var(--premium)', borderLeft: premiumShare ? '1.5px solid var(--ink)' : 'none' }} />
              </div>
              <div className="legend-row">
                <span className="dot" style={{ background: 'var(--tealSoft)' }} />
                <span className="name">Free</span>
                <span className="num">{formatNumber(data.plans.free)}</span>
              </div>
              <div className="legend-row">
                <span className="dot" style={{ background: 'var(--premium)' }} />
                <span className="name">Premium</span>
                <span className="num">{formatNumber(data.plans.premium)}</span>
              </div>
              <div className="legend-row">
                <span className="dot" style={{ background: 'var(--terracottaSoft)' }} />
                <span className="name">Focus time, all time</span>
                <span className="num">{formatMinutes(data.focus_minutes_total)}</span>
              </div>
            </div>
          </div>

          <div className="neo card">
            <div className="card-head">
              <div>
                <h2>Newest users</h2>
                <div className="sub">The latest people to create an account</div>
              </div>
              <Link to="/users" className="btn btn-sm" style={{ textDecoration: 'none' }}>All users</Link>
            </div>
            {data.recent_signups.length === 0 && <div className="empty">No users yet.</div>}
            {data.recent_signups.map((u) => (
              <div className="list-row" key={u.id}>
                <Avatar name={u.display_name} email={u.email} />
                <div className="grow">
                  <div className="t">{u.display_name || 'No name yet'}</div>
                  <div className="s">{u.email}</div>
                </div>
                <span className="muted small" style={{ fontWeight: 500 }}>{timeAgo(u.created_at)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
