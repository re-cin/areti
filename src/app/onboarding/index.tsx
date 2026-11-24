import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { Wordmark } from '@/components/brand/Wordmark';
import { NeoButton } from '@/components/ui/NeoButton';
import { colors, fonts } from '@/theme';

const GHOST = require('../../../assets/images/welcome-ghost.png');

/** How far the curved bottom of the teal header dips below its straight sides. */
const CURVE_DEPTH = 89;

/**
 * Welcome screen (first screen for new users).
 * Sizes come from the Figma frame, which is 390 pt wide.
 */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [headerHeight, setHeaderHeight] = useState(0);

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

        <Image source={GHOST} style={styles.ghost} accessibilityLabel="Reti the ghost" />
        <Text style={styles.welcome}>Welcome to</Text>
        <View style={styles.wordmark}>
          {/* The wordmark cuts small shapes in its background color, so pass the header teal. */}
          <Wordmark width={186} backgroundColor={colors.welcomeTeal} />
        </View>
      </View>

      {/* Intro text */}
      <View style={styles.intro}>
        <Text style={styles.title}>Your smart study planner</Text>
        <Text style={styles.subtitle}>to accompany you at every step toward{'\n'}excellence.</Text>
      </View>

      <View style={styles.spacer} />

      {/* Bottom: divider, button, tagline */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom - 14, 16) }]}>
        <View style={styles.divider} />
        <NeoButton
          label="Get Started"
          backgroundColor={colors.peach}
          textVariant="heading"
          onPress={() => router.push('/onboarding/intro')}
        />
        <Text style={styles.tagline}>“Excellence in Every Session”</Text>
      </View>
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
    width: 281,
    height: 281,
  },
  welcome: {
    fontFamily: fonts.semiBold,
    fontSize: 43,
    lineHeight: 48,
    color: colors.wordmark,
    marginTop: 18,
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
