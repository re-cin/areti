import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { Wordmark } from '@/components/brand/Wordmark';
import { colors, fonts } from '@/theme';

const ICON = require('../../../assets/images/areti-icon.png');
const ICON_SIZE = 115;

/** Keep the splash up at least this long so the intro can play. */
const MIN_VISIBLE_MS = 1500;

type Props = {
  /** True once fonts and the database are ready. */
  ready: boolean;
  /** True once Fredoka has loaded, so the tagline never shows in a fallback font. */
  fontsLoaded: boolean;
  /** Called after the exit animation finishes, so the parent can stop rendering this. */
  onFinish: () => void;
};

/**
 * Full splash screen: icon in the middle, wordmark and tagline at the bottom.
 *
 * The native splash (app.json → expo-splash-screen) shows just the icon at the same
 * size and spot. This overlay takes over as soon as it is drawn and animates:
 *   1. Wake up: the ghost squashes and stretches ("boing") with a little wiggle,
 *      while the wordmark and tagline slide up.
 *   2. Hover: it bobs gently while the app loads.
 *   3. Take off: it crouches, then launches up off the screen with a spin,
 *      and the splash fades away to reveal the app.
 * With Reduce Motion turned on, it simply fades.
 */
export function SplashOverlay({ ready, fontsLoaded, onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [v] = useState(() => ({
    scaleX: new Animated.Value(1),
    scaleY: new Animated.Value(1),
    rotate: new Animated.Value(0), // degrees
    lift: new Animated.Value(0), // translateY of the icon
    text: new Animated.Value(0), // 0 hidden → 1 shown (wordmark + tagline)
    screen: new Animated.Value(1), // whole overlay opacity
  }));

  const [reduceMotion, setReduceMotion] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const hover = useRef<Animated.CompositeAnimation | null>(null);

  // 1 + 2: wake up, then hover
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => setMinTimePassed(true), MIN_VISIBLE_MS);

    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (__DEV__) console.log(`[splash] phone says reduce motion: ${reduce}`);
      setReduceMotion(reduce);
      if (reduce) {
        v.text.setValue(1);
        return;
      }

      const spring = (value: Animated.Value, toValue: number) =>
        Animated.spring(value, { toValue, friction: 4, tension: 160, useNativeDriver: true });
      const timing = (value: Animated.Value, toValue: number, duration: number) =>
        Animated.timing(value, { toValue, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true });

      Animated.parallel([
        // Boing: squash down, stretch up, settle with a spring.
        Animated.sequence([
          Animated.parallel([timing(v.scaleX, 1.14, 110), timing(v.scaleY, 0.84, 110)]),
          Animated.parallel([timing(v.scaleX, 0.9, 140), timing(v.scaleY, 1.14, 140), timing(v.lift, -18, 140)]),
          Animated.parallel([spring(v.scaleX, 1), spring(v.scaleY, 1), spring(v.lift, 0)]),
        ]),
        // Little "hello" wiggle.
        Animated.sequence([
          Animated.delay(250),
          timing(v.rotate, -8, 110),
          timing(v.rotate, 7, 140),
          timing(v.rotate, -4, 120),
          spring(v.rotate, 0),
        ]),
        // Wordmark + tagline slide up.
        Animated.sequence([
          Animated.delay(180),
          Animated.timing(v.text, { toValue: 1, duration: 450, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
        ]),
      ]).start(({ finished }) => {
        if (!finished || cancelled) return;
        hover.current = Animated.loop(
          Animated.sequence([timing(v.lift, -8, 900), timing(v.lift, 0, 900)]),
        );
        hover.current.start();
      });
    });

    return () => {
      cancelled = true;
      clearTimeout(t);
      hover.current?.stop();
    };
  }, [v]);

  // 3: take off
  useEffect(() => {
    if (!ready || !minTimePassed) return;
    hover.current?.stop();

    const fade = (delay: number, duration: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v.screen, { toValue: 0, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]);

    const exit = reduceMotion
      ? fade(0, 300)
      : Animated.parallel([
          Animated.sequence([
            // Crouch...
            Animated.parallel([
              Animated.timing(v.scaleX, { toValue: 1.12, duration: 140, useNativeDriver: true }),
              Animated.timing(v.scaleY, { toValue: 0.86, duration: 140, useNativeDriver: true }),
              Animated.timing(v.lift, { toValue: 6, duration: 140, useNativeDriver: true }),
            ]),
            // ...and launch.
            Animated.parallel([
              Animated.timing(v.lift, { toValue: -height, duration: 520, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
              Animated.timing(v.scaleX, { toValue: 0.8, duration: 520, useNativeDriver: true }),
              Animated.timing(v.scaleY, { toValue: 1.2, duration: 520, useNativeDriver: true }),
              Animated.timing(v.rotate, { toValue: -14, duration: 520, useNativeDriver: true }),
            ]),
          ]),
          Animated.timing(v.text, { toValue: 0, duration: 250, useNativeDriver: true }),
          fade(320, 360),
        ]);

    exit.start(({ finished }) => finished && onFinish());
  }, [ready, minTimePassed, reduceMotion, height, v, onFinish]);

  const iconStyle = {
    transform: [
      { translateY: v.lift },
      { rotate: v.rotate.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) },
      { scaleX: v.scaleX },
      { scaleY: v.scaleY },
    ],
  };
  const textStyle = {
    opacity: v.text,
    transform: [{ translateY: v.text.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  };

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.container, { opacity: v.screen }]}
      // Swap the native splash for this one the moment it is on screen.
      onLayout={() => SplashScreen.hideAsync()}>
      <View style={styles.center}>
        <Animated.Image source={ICON} style={[styles.icon, iconStyle]} accessibilityLabel="Areti" />
      </View>

      <Animated.View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }, textStyle]}>
        <Wordmark width={133} />
        <Text style={[styles.tagline, { opacity: fontsLoaded ? 1 : 0 }]}>“Excellence in Every Session”</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.splash,
    zIndex: 100,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  tagline: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.inkSoft,
    marginTop: 2,
  },
});
