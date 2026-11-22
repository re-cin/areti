import { useCallback, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { router, useFocusEffect } from 'expo-router';
import { Wordmark } from '@/components/brand/Wordmark';
import { NeoButton } from '@/components/ui/NeoButton';
import { colors, fonts } from '@/theme';

const GHOST = require('../../../assets/images/welcome-ghost.png');

/** How far the curved bottom of the teal header dips below its straight sides. */
const CURVE_DEPTH = 89;
const GHOST_SIZE = 281;

/**
 * Welcome screen (first screen for new users).
 * Sizes come from the Figma frame, which is 390 pt wide.
 */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [headerHeight, setHeaderHeight] = useState(0);

  // Exit animation ("ghost portal"), see leave() below.
  const v = useRef({
    ghostScale: new Animated.Value(1),
    ghostSpin: new Animated.Value(0), // degrees
    title: new Animated.Value(1), // "Welcome to areti": 1 shown → 0 gone
    rest: new Animated.Value(1), // intro text + button + tagline: 1 shown → 0 gone
  }).current;
  const leaving = useRef(false);

  // Coming back (e.g. Back from the onboarding pages): put everything back in place.
  useFocusEffect(
    useCallback(() => {
      leaving.current = false;
      v.ghostScale.setValue(1);
      v.ghostSpin.setValue(0);
      v.title.setValue(1);
      v.rest.setValue(1);
    }, [v]),
  );

  /**
   * Get Started: everything else drops away, the ghost winds up (squash + wiggle),
   * then zooms with a little spin until it fills the screen, and the first
   * onboarding page fades in from inside it.
   */
  const leave = async () => {
    if (leaving.current) return;
    leaving.current = true;
    const go = () => router.push('/onboarding/intro');

    if (await AccessibilityInfo.isReduceMotionEnabled()) return go();

    // Scale that makes the circle cover the farthest screen corner.
    const centerY = insets.top + 26 + GHOST_SIZE / 2;
    const reach = Math.hypot(width / 2, Math.max(centerY, height - centerY));
    const cover = (2 * reach) / GHOST_SIZE + 0.3;

    const t = (value: Animated.Value, toValue: number, duration: number, easing = Easing.inOut(Easing.quad)) =>
      Animated.timing(value, { toValue, duration, easing, useNativeDriver: true });

    Animated.parallel([
      t(v.rest, 0, 260, Easing.in(Easing.quad)),
      Animated.sequence([Animated.delay(60), t(v.title, 0, 240, Easing.in(Easing.back(1.5)))]),
      Animated.sequence([
        // Wind up...
        Animated.parallel([
          t(v.ghostScale, 0.9, 160),
          Animated.sequence([t(v.ghostSpin, -7, 90), t(v.ghostSpin, 7, 120), t(v.ghostSpin, 0, 90)]),
        ]),
        // ...and dive in.
        Animated.parallel([
          t(v.ghostScale, cover, 520, Easing.in(Easing.cubic)),
          t(v.ghostSpin, 18, 520, Easing.in(Easing.cubic)),
        ]),
      ]),
    ]).start(({ finished }) => finished && go());
  };

  const ghostStyle = {
    transform: [
      { scale: v.ghostScale },
      { rotate: v.ghostSpin.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) },
    ],
  };
  const titleStyle = {
    opacity: v.title,
    transform: [{ scale: v.title.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
  };
  const restStyle = {
    opacity: v.rest,
    transform: [{ translateY: v.rest.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      bounces={false}
      showsVerticalScrollIndicator={false}>
      {/* Teal header with a curved bottom edge */}
      <View
        style={[styles.header, { paddingTop: insets.top + 26 }]}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
        {headerHeight > 0 && (
          <Svg width={width} height={headerHeight} style={StyleSheet.absoluteFill}>
            <Path d={headerPath(width, headerHeight)} fill={colors.welcomeTeal} />
          </Svg>
        )}

        <Animated.View style={titleStyle}>
          <Text style={[styles.welcome, { marginTop: 18 + GHOST_SIZE }]}>Welcome to</Text>
          <View style={styles.wordmark}>
            {/* The wordmark cuts small shapes in its background color, so pass the header teal. */}
            <Wordmark width={186} backgroundColor={colors.welcomeTeal} />
          </View>
        </Animated.View>

        {/* Drawn last so it zooms over everything when leaving. */}
        <Animated.Image
          source={GHOST}
          style={[styles.ghost, { top: insets.top + 26 }, ghostStyle]}
          accessibilityLabel="Reti the ghost"
        />
      </View>

      {/* Intro text */}
      <Animated.View style={[styles.intro, restStyle]}>
        <Text style={styles.title}>Your smart study planner</Text>
        <Text style={styles.subtitle}>to accompany you at every step toward{'\n'}excellence.</Text>
      </Animated.View>

      <View style={styles.spacer} />

      {/* Bottom: divider, button, tagline */}
      <Animated.View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom - 14, 16) }, restStyle]}>
        <View style={styles.divider} />
        <NeoButton
          label="Get Started"
          backgroundColor={colors.peach}
          textVariant="heading"
          onPress={leave}
        />
        <Text style={styles.tagline}>“Excellence in Every Session”</Text>
      </Animated.View>
    </ScrollView>
  );
}

/** Rectangle whose bottom edge is a circular arc dipping CURVE_DEPTH below the sides. */
function headerPath(w: number, h: number) {
  const sideBottom = h - CURVE_DEPTH;
  const r = ((w / 2) ** 2 + CURVE_DEPTH ** 2) / (2 * CURVE_DEPTH);
  return `M0 0 H${w} V${sideBottom} A${r} ${r} 0 0 1 0 ${sideBottom} Z`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.splash,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 44,
  },
  ghost: {
    position: 'absolute',
    width: GHOST_SIZE,
    height: GHOST_SIZE,
    zIndex: 10,
    elevation: 10,
  },
  welcome: {
    fontFamily: fonts.semiBold,
    fontSize: 43,
    lineHeight: 48,
    color: colors.wordmark,
  },
  wordmark: {
    marginTop: -15,
  },
  intro: {
    alignItems: 'center',
    paddingTop: 28,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 19,
    lineHeight: 24,
    color: colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  bottom: {
    paddingHorizontal: 28,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginBottom: 38,
  },
  tagline: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: 34,
  },
});
