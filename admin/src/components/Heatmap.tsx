import { addDays, dayKey, intensity, startOfDay } from '../lib/stats';
import { formatMinutes } from '../lib/format';

const LEVELS = ['var(--heat-0)', 'var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)'];

/** GitHub-style study calendar: one square per day, Monday at the top, same colors as the app. */
export function Heatmap({ byDay, weeks = 20 }: { byDay: Map<string, number>; weeks?: number }) {
  const today = startOfDay(new Date());
  const thisMonday = addDays(today, -((today.getDay() + 6) % 7));
  const start = addDays(thisMonday, -(weeks - 1) * 7);
  const cols = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)),
  );
  return (
    <div>
      <div className="heatmap">
        <div className="heat-days">
          {['Mon', '', 'Wed', '', 'Fri', '', ''].map((l, i) => <span key={i}>{l}</span>)}
        </div>
        {cols.map((col, w) => (
          <div className="heat-col" key={w}>
            <span className="heat-month">
              {col[0].getDate() <= 7 ? col[0].toLocaleDateString('en-US', { month: 'short' }) : ''}
            </span>
            {col.map((d) => {
              const future = d > today;
              const min = byDay.get(dayKey(d)) ?? 0;
              return (
                <span
                  key={dayKey(d)}
                  className={`heat-cell${future ? ' future' : ''}`}
                  style={{ background: future ? 'transparent' : LEVELS[intensity(min)] }}
                  title={future ? '' : `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${min ? formatMinutes(min) : 'no study'}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="heat-legend">
        Less {LEVELS.map((c) => <span key={c} className="heat-cell" style={{ background: c }} />)} More
      </div>
    </div>
  );
}
