import type { DailyPoint } from '../lib/types';

type Props = {
  data: DailyPoint[];
  metric: 'focus_minutes' | 'signups';
  format: (n: number) => string;
};

/** Teal bars in a cream well, like the Statistics tab. Today's bar is terracotta. */
export function BarChart({ data, metric, format }: Props) {
  const max = Math.max(1, ...data.map((d) => d[metric]));
  // At most ~12 labels whatever the range, counted back from today so the last bar is always labelled.
  const every = Math.max(1, Math.ceil(data.length / 12));
  const label = (day: string, i: number) => {
    const d = new Date(`${day}T00:00:00`);
    if (data.length <= 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
    if ((data.length - 1 - i) % every !== 0) return '';
    return d.getDate() === 1 || i === 0 || every > 3
      ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : String(d.getDate());
  };
  const gap = data.length > 60 ? 2 : data.length > 20 ? 5 : 8;
  return (
    <div>
      <div className="bars" style={{ gap }}>
        {data.map((d, i) => (
          <div className="bar-col" key={d.day}>
            <div className="tip">
              {new Date(`${d.day}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {format(d[metric])}
            </div>
            <div
              className={`bar${i === data.length - 1 ? ' today' : ''}`}
              style={{ height: `${(d[metric] / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="bar-labels" style={{ gap }}>
        {data.map((d, i) => (
          <span key={d.day}>{label(d.day, i)}</span>
        ))}
      </div>
    </div>
  );
}
