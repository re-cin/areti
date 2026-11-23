import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

const IN_MS = 160;
const OUT_MS = 110;

/**
 * Snappy fade for popups. React Native's built-in Modal fade is slow (about 300 ms, can't be changed),
 * so popups use animationType="none" and this: quick fade + slight scale in, faster fade out.
 * Keep the Modal mounted while `mounted` is true so the fade-out can play.
 */
export function useQuickFade(visible: boolean) {
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, { toValue: 1, duration: IN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: OUT_MS, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(
        ({ finished }) => finished && setMounted(false),
      );
    }
  }, [visible, progress]);

  const backdropStyle = { opacity: progress };
  const cardStyle = {
    opacity: progress,
    transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
  };
  return { mounted, backdropStyle, cardStyle };
}
