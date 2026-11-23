import { useMemo, useState } from 'react';
import { formatMinutes } from '../lib/format';
import { addDays, dayKey, intensity, startOfDay } from '../lib/stats';
import type { UserDetail } from '../lib/types';
import { Icon } from './Icon';

type Props = {
  sessions: UserDetail['sessions'];
  subjects: Map<string, UserDetail['subjects'][number]>;
  byDay: Map<string, number>;
  streak: { current: number; peak: number };
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HEAT = [0, 1, 2, 3, 4].map((i) => `var(--heat-${i})`);

/** 6 weeks × 7 days starting on the Monday on or before the 1st of the month. */
function monthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/**
 * Month calendar like the app's Statistics tab: studied days are tiles shaded by how long
 * they studied. Click a day to see what they did that day.
 */
export function MonthCalendar({ sessions, subjects, byDay, streak }: Props) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);

  const days = monthGrid(month);
  // Always 6 rows, so the calendar keeps the same height whatever the month.
  const weeks = Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7));

  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const monthMin = [...byDay.entries()].filter(([k]) => k.startsWith(monthKey)).reduce((a, [, m]) => a + m, 0);
  const monthDays = [...byDay.keys()].filter((k) => k.startsWith(monthKey)).length;

  const selKey = dayKey(selected);
  const daySessions = sessions.filter((s) => dayKey(s.started_at) === selKey);
  const dayMin = daySessions.reduce((a, s) => a + s.duration_sec / 60, 0);
  const daySubjects = new Map<string, number>();
  for (const s of daySessions) {
    const k = s.subject_id && subjects.has(s.subject_id) ? s.subject_id : '';
    daySubjects.set(k, (daySubjects.get(k) ?? 0) + s.duration_sec / 60);
  }

  const go = (delta: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  const pick = (d: Date) => {
    setSelected(d);
    if (d.getMonth() !== month.getMonth()) setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  return (
    <div className="mcal-wrap">
      <div className="mcal">
        <div className="mcal-head">
          <button className="icon-btn mcal-nav" onClick={() => go(-1)} aria-label="Previous month">
            <Icon name="chevronLeft" size={16} strokeWidth={2.5} />
          </button>
          <span className="mcal-title">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <button className="icon-btn mcal-nav" onClick={() => go(1)} aria-label="Next month">
            <Icon name="chevronRight" size={16} strokeWidth={2.5} />
          </button>
        </div>
        <div className="mcal-grid mcal-weekdays">
          {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
        </div>
        {weeks.map((week, wi) => (
          <div className="mcal-grid" key={wi}>
            {week.map((d) => {
              const inMonth = d.getMonth() === month.getMonth();
              const mins = byDay.get(dayKey(d)) ?? 0;
              const level = intensity(mins);
              const isSel = dayKey(d) === selKey;
              const isToday = dayKey(d) === dayKey(today);
              const tiled = inMonth && level > 0;
              return (
                <button
                  key={dayKey(d)}
                  className={`mcal-day${tiled ? ' tiled' : ''}${isSel ? ' selected' : ''}${isToday ? ' today' : ''}${inMonth ? '' : ' out'}`}
                  style={tiled && !isSel ? { background: HEAT[level] } : undefined}
                  onClick={() => pick(d)}
                  title={mins ? `${formatMinutes(mins)} studied` : 'No study'}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        ))}
        <div className="mcal-foot">
          <Icon name="flame" size={20} color="var(--terracottaDark)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: 'var(--terracottaDark)' }}>{streak.current} day streak</div>
            <div className="small muted" style={{ fontWeight: 500 }}>Peak streak: {streak.peak}</div>
          </div>
          <span className="mcal-legend">LESS {HEAT.map((c) => <i key={c} style={{ background: c }} />)} MORE</span>
        </div>
      </div>

      <div className="mcal-side">
        <div className="label">This month</div>
        <div className="mcal-month">
          <div><b>{formatMinutes(monthMin)}</b><span>Focus</span></div>
          <div><b>{monthDays}</b><span>Study days</span></div>
        </div>

        <div className="label" style={{ marginTop: 18 }}>
          {selected.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
        {daySessions.length === 0 ? (
          <div className="muted small" style={{ marginTop: 8, fontWeight: 500 }}>
            {selected > today ? 'This day hasn’t happened yet.' : 'No focus sessions this day.'}
          </div>
        ) : (
          <>
            <div className="mcal-day-total">
              <b>{formatMinutes(dayMin)}</b>
              <span className="muted"> in {daySessions.length} session{daySessions.length === 1 ? '' : 's'}</span>
            </div>
            {[...daySubjects.entries()].sort((a, b) => b[1] - a[1]).map(([id, m]) => {
              const sub = subjects.get(id);
              return (
                <div className="kv" key={id || 'none'}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="dot" style={{ background: sub?.color ?? 'var(--mutedSoft)' }} />
                    {sub?.name ?? 'No subject'}
                  </span>
                  <b>{formatMinutes(m)}</b>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
