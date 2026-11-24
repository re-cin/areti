// Line icons on a 24x24 grid with round caps, matching the app's Icon component.
export type IconName =
  | 'dashboard' | 'users' | 'crown' | 'logout' | 'search' | 'clock' | 'flame' | 'userPlus'
  | 'pencil' | 'close' | 'download' | 'sync' | 'chevronDown' | 'chevronUp' | 'activity'
  | 'chevronLeft' | 'chevronRight' | 'list' | 'grid' | 'trash' | 'eye' | 'lock' | 'unlock' | 'shield' | 'ghost' | 'sliders' | 'music' | 'play' | 'pause' | 'upload' | 'plus';

export function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 2 }: {
  name: IconName; size?: number; color?: string; strokeWidth?: number;
}) {
  const p = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const solid = { fill: color, stroke: color, strokeWidth, strokeLinejoin: 'round' as const };
  let body: React.ReactNode;
  switch (name) {
    case 'dashboard':
      body = (<><rect {...p} x={3} y={3} width={7} height={9} rx={2} /><rect {...p} x={14} y={3} width={7} height={5} rx={2} /><rect {...p} x={14} y={12} width={7} height={9} rx={2} /><rect {...p} x={3} y={16} width={7} height={5} rx={2} /></>);
      break;
    case 'users':
      body = (<><path {...p} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle {...p} cx={9} cy={7} r={4} /><path {...p} d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>);
      break;
    case 'crown':
      body = <polygon {...solid} points="2 7 7 11 12 4 17 11 22 7 20 19 4 19 2 7" />;
      break;
    case 'logout':
      body = (<><path {...p} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline {...p} points="16 17 21 12 16 7" /><line {...p} x1={21} y1={12} x2={9} y2={12} /></>);
      break;
    case 'search':
      body = (<><circle {...p} cx={11} cy={11} r={7} /><line {...p} x1={21} y1={21} x2={16.65} y2={16.65} /></>);
      break;
    case 'clock':
      body = (<><circle {...p} cx={12} cy={12} r={10} /><polyline {...p} points="12 6 12 12 16 14" /></>);
      break;
    case 'flame':
      body = <path {...solid} d="M12 2c.8 3.2 4.5 5.4 4.5 10a4.5 4.5 0 0 1-9 0c0-2.2 1.1-3.6 2.2-4.6.1 1.7.9 2.9 2 3.3-.5-3 .1-5.9.3-8.7z" />;
      break;
    case 'userPlus':
      body = (<><path {...p} d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle {...p} cx={8.5} cy={7} r={4} /><line {...p} x1={20} y1={8} x2={20} y2={14} /><line {...p} x1={23} y1={11} x2={17} y2={11} /></>);
      break;
    case 'pencil':
      body = <path {...p} d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />;
      break;
    case 'close':
      body = (<><line {...p} x1={18} y1={6} x2={6} y2={18} /><line {...p} x1={6} y1={6} x2={18} y2={18} /></>);
      break;
    case 'download':
      body = (<><path {...p} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline {...p} points="7 10 12 15 17 10" /><line {...p} x1={12} y1={15} x2={12} y2={3} /></>);
      break;
    case 'sync':
      body = (<><polyline {...p} points="23 4 23 10 17 10" /><polyline {...p} points="1 20 1 14 7 14" /><path {...p} d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>);
      break;
    case 'chevronDown':
      body = <polyline {...p} points="6 9 12 15 18 9" />;
      break;
    case 'chevronUp':
      body = <polyline {...p} points="18 15 12 9 6 15" />;
      break;
    case 'chevronLeft':
      body = <polyline {...p} points="15 18 9 12 15 6" />;
      break;
    case 'chevronRight':
      body = <polyline {...p} points="9 18 15 12 9 6" />;
      break;
    case 'list':
      body = (<><line {...p} x1={8} y1={6} x2={21} y2={6} /><line {...p} x1={8} y1={12} x2={21} y2={12} /><line {...p} x1={8} y1={18} x2={21} y2={18} /><circle {...solid} cx={3.5} cy={6} r={1} /><circle {...solid} cx={3.5} cy={12} r={1} /><circle {...solid} cx={3.5} cy={18} r={1} /></>);
      break;
    case 'grid':
      body = (<><rect {...p} x={3} y={3} width={7} height={7} rx={2} /><rect {...p} x={14} y={3} width={7} height={7} rx={2} /><rect {...p} x={3} y={14} width={7} height={7} rx={2} /><rect {...p} x={14} y={14} width={7} height={7} rx={2} /></>);
      break;
    case 'trash':
      body = (<><polyline {...p} points="3 6 5 6 21 6" /><path {...p} d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>);
      break;
    case 'eye':
      body = (<><path {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle {...p} cx={12} cy={12} r={3} /></>);
      break;
    case 'lock':
      body = (<><rect {...p} x={3} y={11} width={18} height={11} rx={2} /><path {...p} d="M7 11V7a5 5 0 0 1 10 0v4" /></>);
      break;
    case 'unlock':
      body = (<><rect {...p} x={3} y={11} width={18} height={11} rx={2} /><path {...p} d="M7 11V7a5 5 0 0 1 9.9-1" /></>);
      break;
    case 'shield':
      body = <path {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
      break;
    case 'ghost':
      body = (<><path {...p} d="M5 21V10a7 7 0 0 1 14 0v11l-2.5-2-2.5 2-2-2-2 2-2.5-2z" /><circle {...solid} cx={9.5} cy={10.5} r={0.9} /><circle {...solid} cx={14.5} cy={10.5} r={0.9} /></>);
      break;
    case 'sliders':
      body = <path {...p} d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />;
      break;
    case 'music':
      body = (<><path {...p} d="M9 18V5l12-2v13" /><circle {...p} cx={6} cy={18} r={3} /><circle {...p} cx={18} cy={16} r={3} /></>);
      break;
    case 'play':
      body = <polygon {...solid} points="7 4 20 12 7 20 7 4" />;
      break;
    case 'pause':
      body = (<><rect {...solid} x={6} y={4} width={4} height={16} rx={1} /><rect {...solid} x={14} y={4} width={4} height={16} rx={1} /></>);
      break;
    case 'upload':
      body = (<><path {...p} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline {...p} points="17 8 12 3 7 8" /><line {...p} x1={12} y1={3} x2={12} y2={15} /></>);
      break;
    case 'plus':
      body = (<><line {...p} x1={12} y1={5} x2={12} y2={19} /><line {...p} x1={5} y1={12} x2={19} y2={12} /></>);
      break;
    case 'activity':
      body = <polyline {...p} points="22 12 18 12 15 21 9 3 6 12 2 12" />;
      break;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: 'none' }}>
      {body}
    </svg>
  );
}
