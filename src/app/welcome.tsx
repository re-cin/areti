import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, BackHandler, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { Wordmark } from '@/components/brand/Wordmark';
import { NeoButton } from '@/components/ui/NeoButton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { colors, fonts } from '@/theme';

const MASCOT = require('../../assets/images/areti-mascot.png');
const CURVE_DEPTH = 48;

/** Teal header with a curved bottom edge (same shape as the Sign In screen). */
function headerPath(w: number, h: number) {
  const sideBottom = h - CURVE_DEPTH;
  const r = ((w / 2) ** 2 + CURVE_DEPTH ** 2) / (2 * CURVE_DEPTH);
  return `M0 0 H${w} V${sideBottom} A${r} ${r} 0 0 1 0 ${sideBottom} Z`;
}

/**
 * Shown once, right after a new account is created (and its email confirmed).
 * "Have fun learning" opens the Planner.
 */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const user = useCurrentUser();
  const [headerHeight, setHeaderHeight] = useState(0);

  // Everything rises in, then Reti keeps floating gently.
  const [enter] = useState(() => new Animated.Value(0));
  const [float] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return enter.setValue(1);
      Animated.timing(enter, { toValue: 1, duration: 520, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(float, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(float, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => loop?.stop();
  }, [enter, float]);

  const start = () => router.replace('/planner');

  // Android back also continues to the Planner (there's nothing to go back to).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      start();
      return true;
    });
    return () => sub.remove();
  }, []);

  const rise = (delay: number) => ({
    opacity: enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [24 + delay, 0] }) }],
  });
  const mascotStyle = {
    opacity: enter,
    transform: [
      { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
      { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
    ],
  };

  const firstName = user?.hasCustomName ? user.name.split(' ')[0] : null;

  return (
    <View style={styles.screen}>
      <View
        style={[styles.header, { paddingTop: insets.top + 28 }]}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
        {headerHeight > 0 && (
          <Svg width={width} height={headerHeight} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Path d={headerPath(width, headerHeight)} fill={colors.welcomeTeal} />
          </Svg>
        )}
        <Animated.Image source={MASCOT} style={[styles.mascot, mascotStyle]} accessibilityLabel="Reti the ghost waving hello" />
        <Wordmark width={150} backgroundColor={colors.welcomeTeal} />
      </View>

      <View style={[styles.body, { paddingBottom: insets.bottom + 28 }]}>
        <Animated.View style={[styles.copy, rise(0)]}>
          <Text style={styles.title} accessibilityRole="header">
            {firstName ? `Welcome, ${firstName}!` : 'Welcome to areti!'}
          </Text>
          <Text style={styles.message}>
            Your account is ready. Plan your subjects, focus with Pomodoro sessions, and help Reti grow as you study.
          </Text>
        </Animated.View>

        <Animated.View style={rise(12)}>
          <NeoButton
            label="Have fun learning"
            onPress={start}
            backgroundColor={colors.buttonPeach}
            textVariant="heading"
            contentStyle={styles.buttonFace}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.splash,
  },
  header: {
    alignItems: 'center',
    gap: 14,
    paddingBottom: CURVE_DEPTH + 28,
  },
  mascot: {
    width: 140,
    height: 164,
    resizeMode: 'contain',
  },
  body: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingTop: 36,
  },
  copy: {
    gap: 14,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 30,
    lineHeight: 36,
    color: colors.ink,
    textAlign: 'center',
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  buttonFace: {
    paddingVertical: 15,
  },
});
