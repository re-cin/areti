type Segment = { label: string; value: number; color: string };

/** Donut chart in the app's style: ink outline, flat colors, a big number in the middle. */
export function Donut({ segments, size = 180, center, sub }: { segments: Segment[]; size?: number; center: string; sub: string }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const stroke = size * 0.2;
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" style={{ flex: 'none' }}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {segments.filter((s) => s.value > 0).map((s) => {
          const len = (s.value / total) * c;
          const el = (
            <circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}>
              <title>{s.label}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
      </g>
      {/* ink outlines, like every card in the app */}
      <circle cx={size / 2} cy={size / 2} r={r + stroke / 2} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
      <circle cx={size / 2} cy={size / 2} r={r - stroke / 2} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} />
      <text x="50%" y="47%" textAnchor="middle" fontSize={size * 0.13} fontWeight={600} fill="var(--ink)" fontFamily="Fredoka">{center}</text>
      <text x="50%" y="60%" textAnchor="middle" fontSize={size * 0.07} fontWeight={600} fill="var(--muted)" fontFamily="Fredoka">{sub}</text>
    </svg>
  );
}
