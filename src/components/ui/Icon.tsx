import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';
import { colors } from '@/theme';
import { LineIcon, type LineIconName } from './LineIcon';

// Line icons drawn with react-native-svg (24x24 grid, round caps), so no icon font is needed.
// Swap individual paths for the Figma exports whenever they are ready.

export type IconName = OwnIconName | LineIconName;

type OwnIconName =
  | 'user' | 'settings' | 'chevronLeft' | 'chevronRight' | 'chevronDown' | 'chevronUp'
  | 'play' | 'pause' | 'restart' | 'close' | 'plus' | 'plusCircle' | 'clock' | 'sort'
  | 'flame' | 'download' | 'sync' | 'trash' | 'logout' | 'camera' | 'crown' | 'pencil'
  | 'book' | 'sliders' | 'shield' | 'help' | 'info' | 'warning' | 'calendar' | 'stats' | 'ghost' | 'lock';

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number; fill?: string };

const OWN = new Set<string>([
  'user', 'settings', 'chevronLeft', 'chevronRight', 'chevronDown', 'chevronUp', 'play', 'pause', 'restart', 'close',
  'plus', 'plusCircle', 'clock', 'sort', 'flame', 'download', 'sync', 'trash', 'logout', 'camera', 'crown', 'pencil',
  'book', 'sliders', 'shield', 'help', 'info', 'warning', 'calendar', 'stats', 'ghost', 'lock',
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
        // Reti: round dome head, sides that pinch in, a flared hem with four scallops, upright pill eyes.
        return (<><Path {...p} d="M4 11.5a8 8 0 0 1 16 0c0 3 -.8 4.5 -.4 5.9c.3 1 .9 1.6 .9 2.4a2.125 1.5 0 0 1-4.25 0a2.125 1.5 0 0 1-4.25 0a2.125 1.5 0 0 1-4.25 0a2.125 1.5 0 0 1-4.25 0c0-.8.6-1.4.9-2.4c.4-1.4-.4-2.9-.4-5.9Z" /><Path {...p} d="M9.5 10.2v1.8M14.5 10.2v1.8" /></>);
      case 'lock':
        return (<><Rect {...p} x={4} y={11} width={16} height={11} rx={2.5} /><Path {...p} d="M8 11V7a4 4 0 0 1 8 0v4" /></>);
    }
  })();

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}
