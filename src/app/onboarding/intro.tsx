import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Icon } from '@/components/ui/Icon';
import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { hasNotificationPermission, requestNotificationPermission } from '@/lib/notificationPermission';
import { colors, fonts } from '@/theme';

/**
 * The 4 intro screens after the welcome screen. Swipe or use Back / Next.
 * Sizes come from the Figma frames (390 pt wide). Header art: design/onboarding-*.svg.
 */

type Slide = {
  key: string;
  image: ImageSourcePropType;
  title: string;
  body: string;
  /** Slide 4 has extra content (notification card), so its text sits right under the header. */
  layout: 'center' | 'top';
};

const SLIDES: Slide[] = [
  {
    key: 'plan',
    image: require('../../../assets/images/onboarding/onboarding-1.png'),
    title: 'A study plan that builds itself',
    body: 'Add your subjects, set study hours, and exam date and areti schedules every session for you.',
    layout: 'center',
  },
  {
    key: 'pomodoro',
    image: require('../../../assets/images/onboarding/onboarding-2.png'),
    title: 'Optimize your sessions',
    body: 'You can set a pomodoro timer for each planned session to maximize learning efficiently.',
    layout: 'center',
  },
  {
    key: 'ghost',
    image: require('../../../assets/images/onboarding/onboarding-3.png'),
    title: 'Study together with your ghost friend',
    body: 'Every session earns XP and keeps your streak going, so your friend grows with you',
    layout: 'center',
  },
  {
    key: 'pace',
    image: require('../../../assets/images/onboarding/onboarding-4.png'),
    title: 'Keep it to your pace',
    body: 'Adjust your generated schedules , study hours, subjects, and more anytime in the settings.',
    layout: 'top',
  },
];

const MASCOT = require('../../../assets/images/areti-mascot.png');
/** Mascot size and spot on the sign in screen (src/app/auth.tsx), so the hand-off is seamless. */
const MASCOT_W = 105;
const MASCOT_H = 123;
const AUTH_MASCOT_TOP = 14; // below the safe area

/** Header art is 390 × 447 in the design. */
const ART_RATIO = 447 / 390;
/** Top of the art is plain teal, so up to this much can be cropped on short phones. */
const MAX_ART_CROP = 80;
/** Height of the fixed bottom area (divider, dots, buttons) above the safe area. */
const BOTTOM_AREA = 136;

export default function Intro() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const bottomPad = Math.max(insets.bottom, 16) + 20;
  const fullArt = width * ART_RATIO;
  // On short phones, crop the plain teal at the top of the art so the text still fits.
  const artHeight = Math.max(fullArt - MAX_ART_CROP, Math.min(fullArt, height - BOTTOM_AREA - bottomPad - 230));

  const goTo = (i: number) => {
    listRef.current?.scrollToIndex({ index: i, animated: true });
    setIndex(i);
  };
  // --- Finish animation: "Reti hops over to meet you" -----------------------------
  // The page shrinks away, Reti pops in at the center, waves, then hops up to exactly
  // where it sits on the sign in screen, which then fades in around it.
  const [v] = useState(() => ({
    page: new Animated.Value(1), // 1 shown → 0 gone
    pop: new Animated.Value(0), // mascot scale-in 0 → 1
    hop: new Animated.Value(0), // 0 = screen center → 1 = sign-in spot
    squashX: new Animated.Value(1),
    squashY: new Animated.Value(1),
    wave: new Animated.Value(0), // degrees
  }));
  const finishing = useRef(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Coming back to this screen: reset.
  useFocusEffect(
    useCallback(() => {
      finishing.current = false;
      setIsFinishing(false);
      v.page.setValue(1);
      v.pop.setValue(0);
      v.hop.setValue(0);
      v.squashX.setValue(1);
      v.squashY.setValue(1);
      v.wave.setValue(0);
    }, [v]),
  );

  const authTop = insets.top + AUTH_MASCOT_TOP;
  const centerTop = (height - MASCOT_H) / 2;

  // TODO: save "onboarding done" in the database so the welcome screens only show once.
  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    setIsFinishing(true);
    // Reti is now exactly where it sits on sign in; that screen fades in around it.
    const go = () => router.replace({ pathname: '/auth', params: { from: 'onboarding' } });
    if (await AccessibilityInfo.isReduceMotionEnabled()) return go();

    const t = (value: Animated.Value, toValue: number, duration: number, easing = Easing.inOut(Easing.quad)) =>
      Animated.timing(value, { toValue, duration, easing, useNativeDriver: true });
    const spring = (value: Animated.Value, toValue: number) =>
      Animated.spring(value, { toValue, friction: 5, tension: 260, useNativeDriver: true });

    Animated.sequence([
      Animated.parallel([
        t(v.page, 0, 180, Easing.in(Easing.quad)),
        Animated.sequence([Animated.delay(70), spring(v.pop, 1)]),
      ]),
      // Wave hello (quick).
      t(v.wave, -9, 60),
      t(v.wave, 8, 80),
      t(v.wave, 0, 60),
      // Crouch...
      Animated.parallel([t(v.squashX, 1.15, 80), t(v.squashY, 0.82, 80)]),
      // ...hop up (stretching)...
      Animated.parallel([
        t(v.hop, 1, 260, Easing.out(Easing.cubic)),
        t(v.squashX, 0.9, 130),
        t(v.squashY, 1.14, 130),
      ]),
      // ...and land.
      Animated.parallel([t(v.squashX, 1.1, 60), t(v.squashY, 0.9, 60)]),
      Animated.parallel([t(v.squashX, 1, 90), t(v.squashY, 1, 90)]),
    ]).start(({ finished }) => finished && go());
  };

  const pageStyle = {
    opacity: v.page,
    transform: [{ scale: v.page.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
  };
  const mascotStyle = {
    top: authTop,
    opacity: v.pop.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 1, 1] }),
    transform: [
      // From the screen center up to the sign-in spot.
      { translateY: v.hop.interpolate({ inputRange: [0, 1], outputRange: [centerTop - authTop, 0] }) },
      // Squash from the feet, not the middle.
      { translateY: MASCOT_H / 2 },
      { scaleX: Animated.multiply(v.pop, v.squashX) },
      { scaleY: Animated.multiply(v.pop, v.squashY) },
      { translateY: -MASCOT_H / 2 },
      { rotate: v.wave.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) },
    ],
  };
  const next = () => (index === SLIDES.length - 1 ? finish() : goTo(index + 1));
  const back = () => goTo(Math.max(index - 1, 0));

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View style={styles.screen}>
      <Animated.View style={[styles.page, pageStyle]} pointerEvents={isFinishing ? 'none' : 'auto'}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={{ width, paddingBottom: BOTTOM_AREA + bottomPad }}>
            {/* Header art, anchored to the bottom so any cropping happens in the plain teal at the top */}
            <View style={{ height: artHeight, overflow: 'hidden' }}>
              <Image source={item.image} style={{ position: 'absolute', bottom: 0, width, height: fullArt }} />
            </View>

            <View style={[styles.text, item.layout === 'center' ? styles.textCenter : styles.textTop]}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              {item.key === 'pace' && <NotificationCard />}
            </View>
          </View>
        )}
      />

      {/* Skip (real button, so it sits below the status bar on every phone) */}
      <Pressable
        onPress={finish}
        hitSlop={12}
        accessibilityRole="button"
        style={[styles.skip, { top: insets.top + 3 }]}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Fixed bottom: divider, page dots, buttons */}
      <View style={[styles.bottom, { paddingBottom: bottomPad }]}>
        <View style={styles.divider} />
        <Dots count={SLIDES.length} active={index} />
        <View style={styles.buttons}>
          {index > 0 && (
            <NeoButton
              label="Back"
              onPress={back}
              backgroundColor={colors.buttonPeach}
              textVariant="heading"
              contentStyle={styles.buttonFace}
              style={styles.buttonHalf}
            />
          )}
          <NeoButton
            label="Next"
            onPress={next}
            backgroundColor={colors.buttonTeal}
            textVariant="heading"
            contentStyle={styles.buttonFace}
            style={index > 0 ? styles.buttonHalf : styles.buttonFull}
          />
        </View>
      </View>
      </Animated.View>

      {/* Reti, for the finish animation (invisible until then) */}
      <Animated.Image
        source={MASCOT}
        pointerEvents="none"
        style={[styles.mascot, mascotStyle]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}

/** Page indicator: a filled pill for the current page, hollow dots for the rest. */
function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={styles.dots} accessibilityLabel={`Page ${active + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={i === active ? styles.dotActive : styles.dot} />
      ))}
    </View>
  );
}

/** "Turn on reminders" line plus the card that asks for notification permission. */
function NotificationCard() {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    hasNotificationPermission().then(setGranted);
  }, []);

  // Never throws; returns false where notifications aren't available (Expo Go on Android, some browsers).
  const ask = async () => setGranted(await requestNotificationPermission());

  return (
    <>
      <Text style={styles.reminder}>Turn on reminders to stay on track.</Text>
      <NeoBox radius={16} backgroundColor={colors.surface} style={styles.notifCard}>
        <NeoBox radius={10} offset={2} backgroundColor={colors.white} style={styles.bellBox}>
          <Icon name="bell" size={18} />
        </NeoBox>
        <Text style={styles.notifLabel}>Notification</Text>
        <Pressable onPress={ask} disabled={granted} accessibilityRole="button" accessibilityState={{ disabled: granted }}>
          {({ pressed }) => (
            <NeoBox
              radius={999}
              offset={2}
              shadow={!pressed}
              backgroundColor={colors.buttonTeal}
              style={styles.allow}>
              <Text style={styles.allowText}>{granted ? 'Allowed ✓' : 'Allow Permission'}</Text>
            </NeoBox>
          )}
        </Pressable>
      </NeoBox>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.splash,
  },
  page: {
    flex: 1,
  },
  mascot: {
    position: 'absolute',
    alignSelf: 'center',
    width: MASCOT_W,
    height: MASCOT_H,
  },
  text: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  textCenter: {
    justifyContent: 'center',
    paddingBottom: 28,
  },
  textTop: {
    paddingTop: 29,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 26,
    lineHeight: 33,
    color: colors.ink,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19.5,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 16,
  },
  reminder: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 19.5,
    color: colors.ink,
    textAlign: 'center',
    marginTop: 8,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 10,
    marginTop: 22,
    width: 340,
    maxWidth: '100%',
    gap: 10,
  },
  bellBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifLabel: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.ink,
  },
  allow: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  allowText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.ink,
  },
  skip: {
    position: 'absolute',
    right: 30,
  },
  skipText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.ink,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginBottom: 11,
  },
  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 23,
  },
  dotActive: {
    width: 22,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.ink,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.2,
    borderColor: colors.inkSoft,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonFull: {
    flex: 1,
  },
  buttonHalf: {
    flex: 1,
  },
  buttonFace: {
    paddingVertical: 15,
  },
});
