import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { Wordmark } from '@/components/brand/Wordmark';
import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { showComingSoon } from '@/features/account/accountAlerts';
import { showNotice } from '@/stores/notice';
import { colors, fonts } from '@/theme';

/**
 * Settings > Upgrade to Premium. Layout from the Figma "Subscription" frame.
 * Payments are not connected yet: "Go Premium!" shows a notice.
 */

// TODO: real prices and discount once the team decides them (Figma uses the same placeholders).
const PLANS = [
  { id: 'yearly', name: 'Yearly plan', detail: '1 year · ₱[PRICE]', perMonth: '₱[PRICE] / month', renews: '₱[PRICE] / year', badge: 'Save [X]%' },
  { id: 'monthly', name: 'Monthly plan', detail: '1 month · ₱[PRICE]', perMonth: '₱[PRICE] / month', renews: '₱[PRICE] / month', badge: null },
] as const;
type PlanId = (typeof PLANS)[number]['id'];

// What Free and Premium include (from the Figma table).
const BENEFITS: { label: string; free: boolean }[] = [
  { label: 'Cloud sync', free: true },
  { label: 'Unlimited exam plans', free: false },
  { label: 'All background sounds', free: false },
  { label: 'Full statistics history', free: false },
  { label: 'All Reti expressions', free: false },
];

const MASCOT = require('../../../assets/images/areti-mascot.png');
const ROW_HEIGHT = 52;
const STAR = '#F4A61B';

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<PlanId>('yearly');
  const [studentDiscount, setStudentDiscount] = useState(false);
  const selected = PLANS.find((p) => p.id === plan) ?? PLANS[0];

  const goPremium = () =>
    showNotice({
      title: 'Premium is coming soon',
      message: "Payments aren't set up yet. Thanks for wanting to support areti!",
      icon: 'crown',
    });

  return (
    <View style={styles.screen}>
      <ScrollView
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}>
        {/* Teal hero: back button, wordmark, outlined "Premium" */}
        <View style={[styles.hero, { paddingTop: insets.top + 30 }]}>
          <Wordmark width={127} backgroundColor={colors.welcomeTeal} />
          <OutlinedTitle text="Premium" />
          <FloatingReti />
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={[styles.backWrap, { top: insets.top + 26 }]}>
            <NeoBox backgroundColor={colors.white} radius={24} style={styles.back}>
              <BackArrow />
            </NeoBox>
          </Pressable>
        </View>

        {/* Cream sheet */}
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 36 }]}>
          <Text style={styles.headline}>Premium members get more out of every study session</Text>

          {/* Benefits: Free vs Premium, Premium column highlighted */}
          <NeoBox style={styles.table}>
            <View style={styles.colBenefit}>
              <View style={styles.cell}>
                <Text style={styles.colHead}>Benefits</Text>
              </View>
              {BENEFITS.map((b) => (
                <View key={b.label} style={styles.cell}>
                  <Text style={styles.benefit}>{b.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.colFree}>
              <View style={[styles.cell, styles.center]}>
                <Text style={styles.colHead}>Free</Text>
              </View>
              {BENEFITS.map((b) => (
                <View
                  key={b.label}
                  style={[styles.cell, styles.center]}
                  accessible
                  accessibilityLabel={`${b.label}: ${b.free ? 'included' : 'not included'} in Free`}>
                  {b.free ? <Check /> : <View style={styles.dot} />}
                </View>
              ))}
            </View>
            <View style={styles.colPremium}>
              <View style={[styles.cell, styles.center]}>
                <Text style={[styles.colHead, { color: colors.tealDark }]}>Premium</Text>
              </View>
              {BENEFITS.map((b) => (
                <View
                  key={b.label}
                  style={[styles.cell, styles.center]}
                  accessible
                  accessibilityLabel={`${b.label}: included in Premium`}>
                  <Star />
                </View>
              ))}
            </View>
          </NeoBox>

          {/* Plans */}
          <View style={styles.plans} accessibilityRole="radiogroup">
            {PLANS.map((p) => {
              const on = p.id === plan;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setPlan(p.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${p.name}, ${p.detail}`}>
                  <NeoBox
                    backgroundColor={on ? colors.white : colors.surface}
                    shadowColor={on ? colors.tealDark : colors.ink}
                    offset={on ? 4 : 2}
                    style={[styles.plan, on && styles.planOn]}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.planName}>{p.name}</Text>
                      <Text style={styles.planDetail}>{p.detail}</Text>
                    </View>
                    <Text style={styles.planPer}>{p.perMonth}</Text>
                  </NeoBox>
                  {p.badge && (
                    <View style={styles.badge} pointerEvents="none">
                      <Text style={styles.badgeText}>{p.badge}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Student discount */}
          <NeoBox style={styles.discount}>
            <Text style={styles.discountText}>Student discount</Text>
            <Toggle value={studentDiscount} onChange={setStudentDiscount} label="Student discount" />
          </NeoBox>

          <NeoButton
            label="Go Premium!"
            onPress={goPremium}
            backgroundColor={colors.wordmark}
            textColor={colors.white}
            shadowColor={colors.tealDark}
            textVariant="heading"
            contentStyle={{ paddingVertical: 15 }}
          />

          <View style={styles.footer}>
            <Text style={styles.renews}>Auto-renews for {selected.renews} until cancelled</Text>
            <View style={styles.links}>
              <Pressable onPress={() => showComingSoon('Terms of Use')} hitSlop={8} accessibilityRole="link">
                <Text style={styles.link}>Terms of Use</Text>
              </Pressable>
              <Text style={styles.linkDot}>·</Text>
              <Pressable onPress={() => showComingSoon('Privacy Policy')} hitSlop={8} accessibilityRole="link">
                <Text style={styles.link}>Privacy Policy</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Big title with a black outline and a hard shadow. React Native has no text stroke,
 * so the outline is the same text drawn in ink at small offsets behind the colored text.
 */
function OutlinedTitle({ text }: { text: string }) {
  const o = 2.5;
  const ring = [
    [-o, 0], [o, 0], [0, -o], [0, o],
    [-o * 0.7, -o * 0.7], [o * 0.7, -o * 0.7], [-o * 0.7, o * 0.7], [o * 0.7, o * 0.7],
  ];
  // Shadow: the outline ring again, moved 4 down and right.
  const layers = [...ring.map(([x, y]) => [x + 4, y + 4]), [4, 4], ...ring];
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={text}>
      {layers.map(([x, y], i) => (
        <Text
          key={i}
          style={[styles.title, StyleSheet.absoluteFill, { color: colors.ink, transform: [{ translateX: x }, { translateY: y }] }]}
          importantForAccessibility="no-hide-descendants">
          {text}
        </Text>
      ))}
      <Text style={[styles.title, { color: colors.buttonPeach }]} importantForAccessibility="no-hide-descendants">
        {text}
      </Text>
    </View>
  );
}

/** Small Reti floating gently up and down (still when Reduce Motion is on). */
function FloatingReti() {
  const [float] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce || cancelled) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(float, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(float, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [float]);
  return (
    <Animated.Image
      source={MASCOT}
      accessibilityLabel="Reti the ghost"
      style={[styles.reti, { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }]}
    />
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const [x] = useState(() => new Animated.Value(value ? 1 : 0));
  useEffect(() => {
    Animated.timing(x, { toValue: value ? 1 : 0, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [value, x]);
  return (
    <Pressable
      onPress={() => onChange(!value)}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      style={[styles.track, { backgroundColor: value ? colors.teal : colors.divider }]}>
      <Animated.View
        style={[styles.knob, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) }] }]}
      />
    </Pressable>
  );
}

function BackArrow() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M11 18l-6-6 6-6" stroke={colors.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Check() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={colors.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Star() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8L12 2.8z"
        fill={STAR}
        stroke={colors.ink}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.welcomeTeal },
  hero: { alignItems: 'center', gap: 4, paddingBottom: 30 },
  backWrap: { position: 'absolute', left: 20 },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  reti: { width: 64, height: 75, resizeMode: 'contain', marginTop: 10 },
  title: { fontFamily: fonts.semiBold, fontSize: 60, lineHeight: 72, letterSpacing: 1 },
  sheet: {
    flex: 1,
    backgroundColor: colors.splash,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 2,
    borderColor: colors.ink,
    paddingTop: 28,
    paddingHorizontal: 20,
    gap: 20,
  },
  headline: { fontFamily: fonts.semiBold, fontSize: 20, lineHeight: 26, color: colors.ink, textAlign: 'center' },
  table: { flexDirection: 'row', gap: 4, paddingVertical: 12, paddingLeft: 16, paddingRight: 12 },
  colBenefit: { flex: 1 },
  colFree: { width: 60 },
  colPremium: { width: 92, backgroundColor: colors.tealSoft, borderRadius: 16 },
  cell: { height: ROW_HEIGHT, justifyContent: 'center' },
  center: { alignItems: 'center' },
  colHead: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.muted },
  benefit: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.ink },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.divider },
  plans: { gap: 16, paddingTop: 10 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18, paddingHorizontal: 20 },
  planOn: { borderColor: colors.tealDark, borderWidth: 3 },
  planName: { fontFamily: fonts.semiBold, fontSize: 17, color: colors.ink },
  planDetail: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.ink },
  planPer: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
  badge: {
    position: 'absolute',
    top: -14,
    right: 18,
    backgroundColor: colors.tealDark,
    borderColor: colors.ink,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  badgeText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.white },
  discount: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, paddingLeft: 20, paddingRight: 18 },
  discountText: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.ink },
  track: { width: 52, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: colors.ink, padding: 2.5, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.ink },
  footer: { alignItems: 'center', gap: 8 },
  renews: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center' },
  links: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  link: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.ink, textDecorationLine: 'underline' },
  linkDot: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.muted },
});
