import type { ReactNode } from 'react';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';
import { colors } from '@/theme';

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
  | 'ghost';

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number };

export function Icon({ name, size = 24, color = colors.ink, strokeWidth = 2 }: Props) {
  const stroke = { stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  const filled = { fill: color } as const;

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
    ghost: (
      <>
        <Path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" {...stroke} />
        <Path d="M9 10h.01M15 10h.01" {...stroke} />
      </>
    ),
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {shapes[name]}
    </Svg>
  );
}
