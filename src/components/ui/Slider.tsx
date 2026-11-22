import { useMemo, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import { colors } from '@/theme';

type Props = {
  value: number; // 0..100
  onChange: (v: number) => void;
  accessibilityLabel: string;
  /** Called when a drag starts / ends. Use it to lock the page scroll while dragging. */
  onDragStart?: () => void;
  onDragEnd?: () => void;
};

const THUMB = 24;
const TRACK = 10;

/** 0-100 slider: dark filled part, white rest, black round thumb. No extra package needed. */
export function Slider({ value, onChange, accessibilityLabel, onDragStart, onDragEnd }: Props) {
  const [width, setWidth] = useState(0);
  const startX = useRef(0);
  const widthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const dragRef = useRef({ onDragStart, onDragEnd });
  dragRef.current = { onDragStart, onDragEnd };

  const toValue = (x: number) => {
    const usable = Math.max(1, widthRef.current - THUMB);
    return Math.round(Math.min(100, Math.max(0, ((x - THUMB / 2) / usable) * 100)));
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (e) => {
          dragRef.current.onDragStart?.();
          startX.current = e.nativeEvent.locationX;
          onChangeRef.current(toValue(startX.current));
        },
        onPanResponderMove: (_e, g) => onChangeRef.current(toValue(startX.current + g.dx)),
        onPanResponderRelease: () => dragRef.current.onDragEnd?.(),
        onPanResponderTerminate: () => dragRef.current.onDragEnd?.(),
      }),
    [],
  );

  const left = (value / 100) * Math.max(0, width - THUMB);

  return (
    <View
      {...responder.panHandlers}
      onLayout={(e) => {
        widthRef.current = e.nativeEvent.layout.width;
        setWidth(e.nativeEvent.layout.width);
      }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: value, text: `${value}%` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) =>
        onChange(Math.min(100, Math.max(0, value + (e.nativeEvent.actionName === 'increment' ? 5 : -5))))
      }
      style={{ height: THUMB + 8, justifyContent: 'center' }}>
      <View
        pointerEvents="none"
        style={{
          height: TRACK,
          borderRadius: TRACK,
          borderWidth: 1.5,
          borderColor: colors.ink,
          backgroundColor: colors.white,
          overflow: 'hidden',
        }}>
        <View style={{ width: left + THUMB / 2, height: '100%', backgroundColor: colors.ink }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left,
          width: THUMB,
          height: THUMB,
          borderRadius: THUMB / 2,
          backgroundColor: colors.ink,
        }}
      />
    </View>
  );
}
