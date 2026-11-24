import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { BarChart } from '../components/BarChart';
import { Donut } from '../components/Donut';
import { EditSubscriptionModal } from '../components/EditSubscriptionModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { MonthCalendar } from '../components/MonthCalendar';
import { Icon, type IconName } from '../components/Icon';
import { PlanBadge, StatusLabel } from '../components/PlanBadge';
import { deleteUser, fetchUserDetail, setAdmin, setDisabled } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, formatMinutes, formatNumber, timeAgo } from '../lib/format';
import { dailySeries, summarize } from '../lib/stats';
import { BILLING_LABEL } from '../lib/types';
import { useAsync } from '../lib/useAsync';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
// Seven app colors, one per weekday.
const WEEKDAY_COLORS = ['var(--teal)', 'var(--terracotta)', 'var(--tealDark)', 'var(--premium)', 'var(--tealSoft)', 'var(--gold)', 'var(--terracottaSoft)'];
const DAY = 86_400_000;

/** ▲ 12% / ▼ 30% compared with the week before. */
function Trend({ now, before }: { now: number; before: number }) {
  if (before <= 0) return now > 0 ? <span className="trend up">new</span> : null;
  const pct = Math.round(((now - before) / before) * 100);
  return <span className={`trend ${pct >= 0 ? 'up' : 'down'}`}>{pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}%</span>;
}

function StripStat({ icon, color, label, value, hint }: { icon: IconName; color: string; label: string; value: string; hint: string }) {
  return (
    <div className="strip-item">
      <span className="bubble" style={{ background: color }}>
        <Icon name={icon} size={18} color={icon === 'flame' ? 'var(--terracottaDark)' : 'var(--ink)'} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="label">{label}</div>
        <div className="strip-value">{value}</div>
        <div className="strip-hint">{hint}</div>
      </div>
    </div>
  );
}

export function UserDetail() {
  const { id = '' } = useParams();
  const { data, error, loading, reload } = useAsync(() => fetchUserDetail(id), [id]);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<null | 'admin' | 'disable' | 'delete'>(null);
  const navigate = useNavigate();
  const { state: auth } = useAuth();
  const myId = auth.status === 'signedIn' ? auth.userId : '';
  const [range, setRange] = useState<14 | 30 | 90>(30);
  const stats = useMemo(() => (data ? summarize(data) : null), [data]);

  if (loading && !data) return <div className="center" style={{ minHeight: 400 }}><div className="spinner" /></div>;
  if (error) return <div className="neo card error">Could not load this user: {error}</div>;
  if (!data || !stats) {
    return (
      <div className="neo card empty">
        This user doesn’t exist anymore. <Link to="/users">Back to users</Link>
      </div>
    );
  }

  const { user, subscription: sub, ghost } = data;
  const isMe = user.id === myId;
  const name = user.display_name || user.email;
  const lastStudied = data.sessions.length ? data.sessions[data.sessions.length - 1].started_at : null;
  const maxWeekday = Math.max(1, ...stats.weekdays);
  const maxSubject = Math.max(1, ...stats.subjectTotals.map((s) => s.minutes));
  const daysLeft = sub.current_period_end ? Math.ceil((Date.parse(sub.current_period_end) - Date.now()) / DAY) : null;
  const xpNeeded = ghost ? 100 * (ghost.level + 1) : 0;
  const memberDays = Math.max(0, Math.floor((Date.now() - Date.parse(user.created_at)) / DAY));
  const dueColor = daysLeft === null ? undefined : daysLeft < 0 ? 'var(--dangerDark)' : daysLeft <= 7 ? 'var(--terracottaDark)' : undefined;

  return (
    <>
      <Link to="/users" className="back-link"><Icon name="chevronLeft" size={18} strokeWidth={2.5} /> All users</Link>

      {/* Profile */}
      <div className="neo profile">
        <Avatar name={user.display_name} email={user.email} src={user.picture_uri} size={72} />
        <div className="profile-main">
          <div className="profile-name">
            <h1>{user.display_name || 'No name yet'}</h1>
            <PlanBadge plan={sub.plan} />
            {user.is_admin && <span className="badge badge-admin">Admin</span>}
            {user.disabled && <span className="badge badge-disabled">Disabled</span>}
            {sub.plan === 'premium' && sub.current_period_end && (
              <span className="due-chip" style={{ color: dueColor }}>
                {daysLeft !== null && daysLeft < 0 ? 'Ended' : 'Due'} {formatDate(sub.current_period_end)}
              </span>
            )}
          </div>
          <div className="muted" style={{ fontWeight: 500 }}>
            {user.email}{!user.email_confirmed && ' · email not verified'}
          </div>
          <div className="profile-meta">
            <span><span className="label">Joined</span>{formatDate(user.created_at)}</span>
            <span><span className="label">Last signed in</span>{timeAgo(user.last_sign_in_at)}</span>
            <span><span className="label">Last studied</span>{timeAgo(lastStudied)}</span>
          </div>
        </div>
        <button className="btn btn-sm btn-cream" onClick={reload} disabled={loading}>
          <Icon name="sync" size={15} /> Refresh
        </button>
      </div>

      <div className="neo stat-strip">
        <StripStat icon="clock" color="var(--teal)" label="Total focus" value={formatMinutes(stats.totalMin)}
          hint={`${formatMinutes(stats.weekMin)} this week`} />
        <StripStat icon="flame" color="var(--terracottaSoft)" label="Streak" value={`${stats.streak.current} day${stats.streak.current === 1 ? '' : 's'}`}
          hint={`Best ${stats.streak.peak} · ${stats.studyDays} study days`} />
        <StripStat icon="activity" color="var(--tealSoft)" label="Sessions" value={formatNumber(stats.sessions)}
          hint={stats.sessions ? `${Math.round((stats.completed / stats.sessions) * 100)}% finished` : 'None yet'} />
        <StripStat icon="dashboard" color="var(--avatar)" label="Daily average" value={formatMinutes(stats.avg30Min)}
          hint="Last 30 days" />
        <StripStat icon="clock" color="var(--premium)" label="Longest session" value={formatMinutes(stats.longestSessionMin)}
          hint={stats.sessions ? 'Single focus block' : '—'} />
      </div>

      <div className="neo card focus-wide">
        <div className="card-head">
          <div>
            <h2>Focus time</h2>
            <div className="sub">Minutes studied per day</div>
          </div>
          <div className="seg">
            {([14, 30, 90] as const).map((d) => (
              <button key={d} className={range === d ? 'on' : ''} onClick={() => setRange(d)}>{d}d</button>
            ))}
          </div>
        </div>
        <BarChart data={dailySeries(stats.byDay, range)} metric="focus_minutes" format={formatMinutes} />
      </div>

      <div className="detail-cols">
        <div className="detail-col">
          <div className="neo card">
            <div className="card-head">
              <div>
                <h2>Study calendar</h2>
                <div className="sub">Click a day to see what they studied</div>
              </div>
            </div>
            <MonthCalendar sessions={data.sessions} subjects={stats.subjects} byDay={stats.byDay} streak={stats.streak} />
          </div>
          <div className="neo card">
            <div className="card-head"><div><h2>Busiest days</h2><div className="sub">Average study time on each weekday</div></div></div>
            {stats.weekdays.every((m) => m === 0) ? (
              <div className="wd-empty">No study time yet.</div>
            ) : (() => {
              const total = stats.weekdays.reduce((x, m) => x + m, 0);
              const best = stats.weekdays.indexOf(maxWeekday);
              return (
                <div className="donut-wrap">
                  <Donut
                    segments={stats.weekdays.map((m, i) => ({ label: `${WEEKDAY_NAMES[i]}: ${formatMinutes(m)}`, value: m, color: WEEKDAY_COLORS[i] }))}
                    center={WEEKDAYS[best]}
                    sub="BUSIEST DAY"
                  />
                  <div className="donut-legend">
                    {stats.weekdays.map((m, i) => (
                      <div className={`kv${i === best ? ' best' : ''}`} key={i}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="dot" style={{ background: WEEKDAY_COLORS[i] }} />{WEEKDAY_NAMES[i]}
                        </span>
                        <span className="small"><b>{formatMinutes(m)}</b><span className="muted"> · {Math.round((m / total) * 100)}%</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="neo card">
            <div className="card-head">
              <div>
                <h2>Subjects</h2>
                <div className="sub">All-time focus by subject</div>
              </div>
            </div>
            {stats.subjectTotals.length === 0 && <div className="empty" style={{ padding: 24 }}>No focus time yet.</div>}
            {stats.subjectTotals.map((s) => (
              <div className="subject-row" key={s.id || 'none'}>
                <span className="dot" style={{ background: s.color }} />
                <span className="name">{s.name}{s.deleted && <span className="muted small"> (deleted)</span>}</span>
                <div className="subject-bar"><div style={{ width: `${(s.minutes / maxSubject) * 100}%`, background: s.color }} /></div>
                <span className="num">{formatMinutes(s.minutes)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="detail-col side">
          <div className="neo card">
            <div className="card-head"><div><h2>Engagement</h2><div className="sub">How actively they use areti</div></div></div>
            <div className="kv"><span>Active days (last 30)</span><b>{stats.activeDays30} / 30</b></div>
            <div className="xp" style={{ margin: '2px 0 6px' }}><div style={{ width: `${(stats.activeDays30 / 30) * 100}%` }} /></div>
            <div className="kv"><span>This week vs last week</span><b>{formatMinutes(stats.weekMin)} <Trend now={stats.weekMin} before={stats.prevWeekMin} /></b></div>
            <div className="kv"><span>Sessions per week</span><b>{stats.sessionsPerWeek.toFixed(1)}</b></div>
            <div className="kv"><span>Average session</span><b>{formatMinutes(stats.avgSessionMin)}</b></div>
            <div className="kv"><span>Finished sessions</span><b>{stats.sessions ? `${Math.round((stats.completed / stats.sessions) * 100)}%` : '—'}</b></div>
            <div className="kv"><span>Planner tasks done</span><b>{data.tasks.done} / {data.tasks.total}{data.tasks.overdue > 0 && <span style={{ color: 'var(--terracottaDark)' }}> · {data.tasks.overdue} overdue</span>}</b></div>
            <div className="kv"><span>Member for</span><b>{memberDays} day{memberDays === 1 ? '' : 's'}</b></div>
          </div>
          {ghost && (
            <div className="neo pet">
              <img src="/mascot.png" alt="" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{ghost.name} · Level {ghost.level}</div>
                <div className="xp"><div style={{ width: `${Math.min(100, (ghost.xp / xpNeeded) * 100)}%` }} /></div>
                <div className="muted small">{ghost.xp} / {xpNeeded} XP to level {ghost.level + 1}</div>
              </div>
            </div>
          )}
          <div className="neo card">
            <div className="card-head"><div><h2>Recent sessions</h2><div className="sub">Latest focus blocks</div></div></div>
            {stats.recent.length === 0 && <div className="muted small">No sessions yet.</div>}
            {stats.recent.map((s) => {
              const subj = s.subject_id ? stats.subjects.get(s.subject_id) : undefined;
              return (
                <div className="kv" key={`${s.started_at}-${s.duration_sec}`}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span className="dot" style={{ background: subj?.color ?? 'var(--mutedSoft)' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subj?.name ?? 'No subject'}</span>
                  </span>
                  <span className="small" style={{ whiteSpace: 'nowrap' }}>
                    <b>{formatMinutes(s.duration_sec / 60)}</b>
                    <span className="muted"> · {timeAgo(s.started_at)}{!s.completed && ' · stopped'}</span>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="neo card">
            <div className="card-head" style={{ marginBottom: 4 }}>
              <div>
                <h2>Account</h2>
                <div className="sub">Plan, access and status</div>
              </div>
            </div>
            <div className="account-row">
              <div className="txt">
                <b>Subscription <PlanBadge plan={sub.plan} />{sub.plan === 'premium' && <StatusLabel status={sub.status} />}</b>
                <div>
                  {sub.plan === 'premium' && sub.current_period_end
                    ? <>{sub.billing_period && `${BILLING_LABEL[sub.billing_period]} · `}{daysLeft !== null && daysLeft < 0 ? 'Ended' : 'Due'} <b style={{ color: dueColor }}>{formatDate(sub.current_period_end)}</b>{daysLeft !== null && daysLeft >= 0 && ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}</>
                    : sub.plan === 'premium' ? 'No end date set' : 'Free plan, no due date'}
                </div>
              </div>
              <button className="btn btn-sm btn-peach" onClick={() => setEditing(true)}>
                <Icon name="pencil" size={14} /> Edit
              </button>
            </div>
            <div className="account-row">
              <div className="txt">
                <b>Admin access {user.is_admin && <span className="badge badge-admin">Admin</span>}</b>
                <div>{user.is_admin ? 'Can open this admin site and manage users.' : 'Normal user. Cannot open the admin site.'}</div>
              </div>
              {isMe && user.is_admin ? <span className="self-note">This is you</span> : (
                <button className="btn btn-sm btn-cream" onClick={() => setConfirm('admin')}>
                  {user.is_admin ? 'Remove admin' : 'Make admin'}
                </button>
              )}
            </div>
            {!user.is_admin && (
              <div className="account-row">
                <div className="txt">
                  <b>Status {user.disabled ? <span className="badge badge-disabled">Disabled</span> : <span className="status status-active">Active</span>}</b>
                  <div>{user.disabled ? 'Cannot sign in to the app. Their data is kept.' : 'Can sign in and use the app normally.'}</div>
                </div>
                {isMe ? <span className="self-note">This is you</span> : (
                  <button className={`btn btn-sm ${user.disabled ? '' : 'btn-cream'}`} onClick={() => setConfirm('disable')}>
                    {user.disabled ? 'Enable account' : 'Disable account'}
                  </button>
                )}
              </div>
            )}
            <div className="account-row danger">
              <div className="txt">
                <b>Delete account</b>
                <div>Permanently deletes the account, profile picture and all their study data. This can’t be undone.</div>
              </div>
              {isMe ? <span className="self-note">This is you</span> : (
                <button className="btn btn-sm btn-danger" onClick={() => setConfirm('delete')}>
                  <Icon name="trash" size={14} /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {confirm === 'admin' && (
        <ConfirmModal
          title={user.is_admin ? 'Remove admin access?' : 'Make this user an admin?'}
          message={user.is_admin
            ? <>{name} will no longer be able to open the admin site.</>
            : <>{name} will be able to see every user, change subscriptions, and disable or delete accounts.</>}
          confirmLabel={user.is_admin ? 'Remove admin' : 'Make admin'}
          onConfirm={async () => { await setAdmin(user.id, !user.is_admin); setConfirm(null); void reload(); }}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === 'disable' && (
        <ConfirmModal
          title={user.disabled ? 'Enable this account?' : 'Disable this account?'}
          message={user.disabled
            ? <>{name} will be able to sign in again.</>
            : <>{name} will be signed out on every device and won’t be able to sign in. Their data stays, and you can enable the account again any time.</>}
          confirmLabel={user.disabled ? 'Enable account' : 'Disable account'}
          danger={!user.disabled}
          onConfirm={async () => { await setDisabled(user.id, !user.disabled); setConfirm(null); void reload(); }}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === 'delete' && (
        <ConfirmModal
          title="Delete this account?"
          message={<>This permanently deletes <b style={{ color: 'var(--ink)' }}>{user.email}</b>, their profile picture, subjects, sessions, tasks, plans and subscription. It can’t be undone.</>}
          confirmLabel="Delete forever"
          danger
          typeToConfirm={user.email}
          onConfirm={async () => { await deleteUser(user.id); navigate('/users', { replace: true }); }}
          onClose={() => setConfirm(null)}
        />
      )}

      {editing && (
        <EditSubscriptionModal
          user={{
            id: user.id, email: user.email, display_name: user.display_name, picture_uri: user.picture_uri,
            plan: sub.plan, subscription_status: sub.status, billing_period: sub.billing_period, current_period_end: sub.current_period_end,
          }}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); void reload(); }}
        />
      )}
    </>
  );
}
