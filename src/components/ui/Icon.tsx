import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';
import { colors } from '@/theme';
import { LineIcon, type LineIconName } from './LineIcon';

<<<<<<< HEAD
// Line icons drawn with react-native-svg (24x24 grid, round caps), so no icon font is needed.
// Swap individual paths for the Figma exports whenever they are ready.
=======
/**
 * Line icons (24×24, Lucide-style) drawn with react-native-svg.
 * Swap individual paths for the Figma exports when they are available.
 */
export type IconName =
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'user'
  | 'camera'
  | 'pencil'
  | 'crown'
  | 'log-out'
  | 'alert'
  | 'trash'
  | 'book'
  | 'sliders'
  | 'shield'
  | 'help'
  | 'info'
  | 'settings'
  | 'reset'
  | 'play'
  | 'pause'
  | 'close'
  | 'plus'
  | 'plus-circle'
  | 'clock'
  | 'sort'
  | 'flame'
  | 'calendar'
  | 'stats'
  | 'ghost'
  | 'bell'
  | 'eye'
  | 'eye-off'
  | 'download'
  | 'lock';
>>>>>>> tine

export type IconName = OwnIconName | LineIconName;

type OwnIconName =
  | 'user' | 'settings' | 'chevronLeft' | 'chevronRight' | 'chevronDown' | 'chevronUp'
  | 'play' | 'pause' | 'restart' | 'close' | 'plus' | 'plusCircle' | 'clock' | 'sort'
  | 'flame' | 'download' | 'sync' | 'trash' | 'logout' | 'camera' | 'crown' | 'pencil'
  | 'book' | 'sliders' | 'shield' | 'help' | 'info' | 'warning' | 'calendar' | 'stats' | 'ghost';

<<<<<<< HEAD
type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number; fill?: string };

const OWN = new Set<string>([
  'user', 'settings', 'chevronLeft', 'chevronRight', 'chevronDown', 'chevronUp', 'play', 'pause', 'restart', 'close',
  'plus', 'plusCircle', 'clock', 'sort', 'flame', 'download', 'sync', 'trash', 'logout', 'camera', 'crown', 'pencil',
  'book', 'sliders', 'shield', 'help', 'info', 'warning', 'calendar', 'stats', 'ghost',
]);

export function Icon({ name, size = 22, color = colors.ink, strokeWidth = 2, fill }: Props) {
  // Names this file does not draw (Ryan's kebab-case set, e.g. 'chevron-left', 'eye') come from LineIcon.
  if (!OWN.has(name)) return <LineIcon name={name as LineIconName} size={size} color={color} strokeWidth={strokeWidth} />;
  const p = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const solid = { fill: fill ?? color, stroke: color, strokeWidth, strokeLinejoin: 'round' as const };

  const body = (() => {
    switch (name) {
      case 'user':
        return (<><Path {...p} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><Circle {...p} cx={12} cy={7} r={4} /></>);
      case 'settings':
        return (<><Circle {...p} cx={12} cy={12} r={3} /><Path {...p} d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></>);
      case 'chevronLeft':
        return <Polyline {...p} points="15 18 9 12 15 6" />;
      case 'chevronRight':
        return <Polyline {...p} points="9 18 15 12 9 6" />;
      case 'chevronDown':
        return <Polyline {...p} points="6 9 12 15 18 9" />;
      case 'chevronUp':
        return <Polyline {...p} points="18 15 12 9 6 15" />;
      case 'play':
        return <Polygon {...solid} points="7 4 20 12 7 20 7 4" />;
      case 'pause':
        return (<><Rect {...solid} x={6} y={4} width={4} height={16} rx={1} /><Rect {...solid} x={14} y={4} width={4} height={16} rx={1} /></>);
      case 'restart':
        return (<><Polyline {...p} points="1 4 1 10 7 10" /><Path {...p} d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></>);
      case 'close':
        return (<><Line {...p} x1={18} y1={6} x2={6} y2={18} /><Line {...p} x1={6} y1={6} x2={18} y2={18} /></>);
      case 'plus':
        return (<><Line {...p} x1={12} y1={5} x2={12} y2={19} /><Line {...p} x1={5} y1={12} x2={19} y2={12} /></>);
      case 'plusCircle':
        return (<><Circle {...p} cx={12} cy={12} r={10} /><Line {...p} x1={12} y1={8} x2={12} y2={16} /><Line {...p} x1={8} y1={12} x2={16} y2={12} /></>);
      case 'clock':
        return (<><Circle {...p} cx={12} cy={12} r={10} /><Polyline {...p} points="12 6 12 12 16 14" /></>);
      case 'sort':
        return <Path {...p} d="M7 20V4M3 8l4-4 4 4M17 4v16M13 16l4 4 4-4" />;
      case 'flame':
        return <Path {...solid} d="M12 2c.8 3.2 4.5 5.4 4.5 10a4.5 4.5 0 0 1-9 0c0-2.2 1.1-3.6 2.2-4.6.1 1.7.9 2.9 2 3.3-.5-3 .1-5.9.3-8.7z" />;
      case 'download':
        return (<><Path {...p} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><Polyline {...p} points="7 10 12 15 17 10" /><Line {...p} x1={12} y1={15} x2={12} y2={3} /></>);
      case 'sync':
        return (<><Polyline {...p} points="23 4 23 10 17 10" /><Polyline {...p} points="1 20 1 14 7 14" /><Path {...p} d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>);
      case 'trash':
        return (<><Polyline {...p} points="3 6 5 6 21 6" /><Path {...p} d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>);
      case 'logout':
        return (<><Path {...p} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><Polyline {...p} points="16 17 21 12 16 7" /><Line {...p} x1={21} y1={12} x2={9} y2={12} /></>);
      case 'camera':
        return (<><Path {...p} d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><Circle {...p} cx={12} cy={13} r={4} /></>);
      case 'crown':
        return <Polygon {...solid} points="2 7 7 11 12 4 17 11 22 7 20 19 4 19 2 7" />;
      case 'pencil':
        return <Path {...p} d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />;
      case 'book':
        return (<><Path {...p} d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><Path {...p} d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>);
      case 'sliders':
        return <Path {...p} d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />;
      case 'shield':
        return <Path {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
      case 'help':
        return (<><Circle {...p} cx={12} cy={12} r={10} /><Path {...p} d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><Line {...p} x1={12} y1={17} x2={12.01} y2={17} /></>);
      case 'info':
        return (<><Circle {...p} cx={12} cy={12} r={10} /><Line {...p} x1={12} y1={16} x2={12} y2={12} /><Line {...p} x1={12} y1={8} x2={12.01} y2={8} /></>);
      case 'warning':
        return (<><Path {...solid} d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><Line {...p} stroke={colors.white} x1={12} y1={9} x2={12} y2={13} /><Line {...p} stroke={colors.white} x1={12} y1={17} x2={12.01} y2={17} /></>);
      case 'calendar':
        return (<><Rect {...p} x={3} y={4} width={18} height={18} rx={2} /><Line {...p} x1={16} y1={2} x2={16} y2={6} /><Line {...p} x1={8} y1={2} x2={8} y2={6} /><Line {...p} x1={3} y1={10} x2={21} y2={10} /></>);
      case 'stats':
        return <Path {...p} d="M3 21h18M5 21v-9a3 3 0 0 1 6 0v9M11 21V8a3 3 0 0 1 6 0v13" />;
      case 'ghost':
        return (<><Path {...p} d="M5 21V11a7 7 0 0 1 14 0v10l-2.33-1.75L14.33 21 12 19.25 9.67 21l-2.34-1.75z" /><Circle {...solid} cx={9.5} cy={11} r={0.6} /><Circle {...solid} cx={14.5} cy={11} r={0.6} /></>);
    }
  })();
=======
  const shapes: Record<IconName, ReactNode> = {
    'chevron-left': <Path d="m15 18-6-6 6-6" {...stroke} />,
    'chevron-right': <Path d="m9 18 6-6-6-6" {...stroke} />,
    'chevron-down': <Path d="m6 9 6 6 6-6" {...stroke} />,
    user: (
      <>
        <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" {...stroke} />
        <Circle cx={12} cy={7} r={4} {...stroke} />
      </>
    ),
    camera: (
      <>
        <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" {...stroke} />
        <Circle cx={12} cy={13} r={3} {...stroke} />
      </>
    ),
    pencil: (
      <>
        <Path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" {...stroke} />
        <Path d="m15 5 4 4" {...stroke} />
      </>
    ),
    crown: (
      <>
        <Path d="M2 7l5 4 5-7 5 7 5-4-2 11H4z" {...filled} />
        <Rect x={4} y={19} width={16} height={2} rx={1} {...filled} />
      </>
    ),
    'log-out': (
      <>
        <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" {...stroke} />
        <Path d="m16 17 5-5-5-5" {...stroke} />
        <Path d="M21 12H9" {...stroke} />
      </>
    ),
    alert: (
      <>
        <Path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" {...filled} />
        <Path d="M12 9v4" stroke={colors.white} strokeWidth={2.2} strokeLinecap="round" />
        <Circle cx={12} cy={17} r={1.2} fill={colors.white} />
      </>
    ),
    trash: (
      <>
        <Path d="M3 6h18" {...stroke} />
        <Path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" {...stroke} />
        <Path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" {...stroke} />
        <Path d="M10 11v6M14 11v6" {...stroke} />
      </>
    ),
    book: (
      <>
        <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" {...stroke} />
        <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" {...stroke} />
      </>
    ),
    sliders: (
      <Path
        d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"
        {...stroke}
      />
    ),
    shield: (
      <>
        <Path
          d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
          {...stroke}
        />
        <Path d="M12 3v18c-3.5-1.5-7-4-7-8V6c2.5 0 5-1.2 7-3z" {...filled} />
      </>
    ),
    help: (
      <>
        <Circle cx={12} cy={12} r={10} {...stroke} />
        <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" {...stroke} />
        <Path d="M12 17h.01" {...stroke} />
      </>
    ),
    info: (
      <>
        <Circle cx={12} cy={12} r={10} {...stroke} />
        <Path d="M12 16v-4M12 8h.01" {...stroke} />
      </>
    ),
    settings: (
      <>
        <Path
          d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
          {...stroke}
        />
        <Circle cx={12} cy={12} r={3} {...stroke} />
      </>
    ),
    reset: (
      <>
        <Path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" {...stroke} />
        <Path d="M3 3v5h5" {...stroke} />
      </>
    ),
    play: <Polygon points="7,4 20,12 7,20" {...filled} stroke={color} strokeWidth={2} strokeLinejoin="round" />,
    pause: (
      <>
        <Rect x={6} y={4} width={4} height={16} rx={1} {...filled} />
        <Rect x={14} y={4} width={4} height={16} rx={1} {...filled} />
      </>
    ),
    close: <Path d="M18 6 6 18M6 6l12 12" {...stroke} />,
    plus: <Path d="M5 12h14M12 5v14" {...stroke} />,
    'plus-circle': (
      <>
        <Circle cx={12} cy={12} r={10} {...stroke} />
        <Path d="M8 12h8M12 8v8" {...stroke} />
      </>
    ),
    download: (
      <>
        <Path d="M12 15V3" {...stroke} />
        <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" {...stroke} />
        <Path d="m7 10 5 5 5-5" {...stroke} />
      </>
    ),
    eye: (
      <>
        <Path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" {...stroke} />
        <Circle cx={12} cy={12} r={3} {...stroke} />
      </>
    ),
    'eye-off': (
      <>
        <Path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" {...stroke} />
        <Path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" {...stroke} />
        <Path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" {...stroke} />
        <Path d="m2 2 20 20" {...stroke} />
      </>
    ),
    bell: (
      <>
        <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" {...stroke} />
        <Path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" {...stroke} />
      </>
    ),
    clock: (
      <>
        <Circle cx={12} cy={12} r={10} {...stroke} />
        <Path d="M12 6v6l4 2" {...stroke} />
      </>
    ),
    sort: <Path d="m21 16-4 4-4-4M17 20V4M3 8l4-4 4 4M7 4v16" {...stroke} />,
    flame: (
      <Path
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"
        {...stroke}
      />
    ),
    calendar: (
      <>
        <Path d="M8 2v4M16 2v4M3 10h18" {...stroke} />
        <Rect x={3} y={4} width={18} height={18} rx={2} {...stroke} />
      </>
    ),
    stats: (
      <Path
        d="M2 21h20M4 21v-6a2 2 0 0 1 4 0v6M8 21V8a3 3 0 0 1 6 0v13M14 21V12a3 3 0 0 1 6 0v9"
        {...stroke}
      />
    ),
    lock: (
      <>
        <Rect x={4} y={11} width={16} height={11} rx={2.5} {...stroke} />
        <Path d="M8 11V7a4 4 0 0 1 8 0v4" {...stroke} />
      </>
    ),
    ghost: (
      // Reti: round dome head, sides that pinch in, a flared hem with four scallops, upright pill eyes.
      <>
        <Path
          d="M4 11.5a8 8 0 0 1 16 0c0 3 -.8 4.5 -.4 5.9c.3 1 .9 1.6 .9 2.4a2.125 1.5 0 0 1-4.25 0a2.125 1.5 0 0 1-4.25 0a2.125 1.5 0 0 1-4.25 0a2.125 1.5 0 0 1-4.25 0c0-.8.6-1.4.9-2.4c.4-1.4-.4-2.9-.4-5.9Z"
          {...stroke}
        />
        <Path d="M9.5 10.2v1.8M14.5 10.2v1.8" {...stroke} />
      </>
    ),
  };
>>>>>>> tine

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}
