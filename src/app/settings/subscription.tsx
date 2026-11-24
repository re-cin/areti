import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { Wordmark } from '@/components/brand/Wordmark';
import { Icon } from '@/components/ui/Icon';
import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { PaymentSheet } from '@/components/settings/PaymentSheet';
import { payWithPayPal } from '@/features/subscription/paypalCheckout';
import { fetchPlanPrices, money, periodText, totalFor, type PlanPrice, type PlanType } from '@/features/subscription/planPrices';
import { showComingSoon } from '@/features/account/accountAlerts';
import { usePremium } from '@/features/subscription/usePremium';
import { premiumDateText, premiumDateTimeText, type PremiumInfo } from '@/features/subscription/premiumInfo';
import { timeLeftText } from '@/features/subscription/timeLeft';
import { useDbQuery } from '@/lib/useDbQuery';
import { showNotice } from '@/stores/notice';
import { colors, fonts } from '@/theme';

/**
 * Settings > Upgrade to Premium. Layout from the Figma "Subscription" frame.
 * Prices come from the Supabase plan_prices table; "Go Premium!" opens the PayPal checkout sheet.
 */

/**
 * What a plan card shows, worked out from its plan_prices row. With `student` on, the card uses
 * the plan's student price (when it has one) and keeps the regular price to show crossed out.
 */
function planCard(p: PlanPrice, all: PlanPrice[], student: boolean) {
  const amount = totalFor(p, student);
  const monthly = all.find((x) => x.periodMonths === 1);
  const months = p.periodMonths ?? 0;
  const monthlyAmount = monthly ? totalFor(monthly, student) : 0;
  const perMonth = months > 0 ? amount / months : 0;
  // "Save X%" compares longer plans with paying monthly for the same time.
  const savePct = monthly && months > 1 ? Math.round((1 - perMonth / monthlyAmount) * 100) : 0;
  // Weekly (and other day-based) plans show their price per week instead of per month.
  const perUnit = p.periodDays
    ? `${money(amount, p.currency)} / ${p.periodDays === 7 ? 'week' : periodText(p)}`
    : `${months > 1 ? '≈ ' : ''}${money(perMonth, p.currency)} / month`;
  return {
    detail: `${periodText(p)} · ${money(amount, p.currency)}`,
    was: amount < p.price ? money(p.price, p.currency) : null,
    perMonth: perUnit,
    badge: savePct > 0 ? `Save ${savePct}%` : null,
  };
}

// What Free and Premium include (from the Figma table).
const BENEFITS: { label: string; free: boolean }[] = [
  { label: 'Cloud sync', free: true },
  { label: 'Unlimited exam plans', free: false },
  { label: 'All background sounds', free: false },
  { label: 'Full statistics history', free: false },
  { label: 'All Reti expressions', free: false },
];

const MASCOT = require('../../../assets/images/areti-mascot.png');
const NO_PRICES: PlanPrice[] = [];
const ROW_HEIGHT = 52;
const STAR = '#F4A61B';

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<PlanType>('yearly');
  const [studentDiscount, setStudentDiscount] = useState(false);
  const prices = useDbQuery(fetchPlanPrices, NO_PRICES);
  const selected = prices.find((p) => p.plan === plan) ?? prices[0] ?? null;
  // The switch shows when any plan has a student price; it turns every card to its student price.
  const hasStudentPrices = prices.some((p) => p.studentPrice !== null);
  const useStudent = studentDiscount && selected?.studentPrice != null;
  const total = selected ? totalFor(selected, useStudent) : 0;
  // Premium status: the Supabase subscriptions row, cached on the phone by refreshSubscription().
  const sub = usePremium(); // live: admin edits, payments and the countdown

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const goPremium = () => {
    if (!selected) {
      showNotice({ title: 'Prices are not loaded', message: 'Check your internet connection and open this page again.' });
      return;
    }
    setPlan(selected.plan);
    setCheckoutOpen(true);
  };

  // PayPal checkout (src/features/subscription/paypalCheckout.ts). The server confirms the
  // payment and switches Premium on; this only shows the result.
  const continueToPayPal = async () => {
    if (paying) return;
    setPaying(true);
    const result = await payWithPayPal(selected?.plan ?? plan, useStudent);
    setPaying(false);
    if (result.kind === 'canceled') return; // back on the sheet, nothing charged
    setCheckoutOpen(false);
    setTimeout(() => {
      if (result.kind === 'paid') {
        showNotice({
          title: "You're Premium!",
          message: `Thanks for supporting areti. Premium is on until ${dateText(result.currentPeriodEnd)}.`,
          icon: 'crown',
          buttonLabel: 'Yay!',
        });
      } else {
        showNotice({ title: 'Payment did not go through', message: result.message });
      }
    }, 260);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}>
        {/* Teal hero: back button, wordmark, outlined "Premium" */}
        <View style={[styles.hero, { paddingTop: insets.top + 30 }]}>
          {/* Wordmark level with the back button, big title below, Reti perched on its top-right corner */}
          <Wordmark width={120} backgroundColor={colors.welcomeTeal} />
          <View style={styles.titleWrap}>
            <OutlinedTitle text="Premium" />
          </View>
          <RunningReti />
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

          {sub.isPremium ? (
            <PremiumStatus sub={sub} now={sub.now} />
          ) : (
            <>
          {/* Plans */}
          <View style={styles.plans} accessibilityRole="radiogroup">
            {prices.length === 0 && <Text style={styles.renews}>Loading prices…</Text>}
            {prices.map((row) => {
              const p = { ...row, ...planCard(row, prices, studentDiscount) };
              const on = selected?.plan === p.plan;
              return (
                <Pressable
                  key={p.plan}
                  onPress={() => setPlan(p.plan)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${p.label}, ${p.detail}`}>
                  <NeoBox
                    backgroundColor={on ? colors.white : colors.surface}
                    shadowColor={on ? colors.tealDark : colors.ink}
                    offset={on ? 4 : 2}
                    style={[styles.plan, on && styles.planOn]}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.planName}>{p.label}</Text>
                      <Text style={styles.planDetail}>
                        {p.detail}
                        {p.was && <Text style={styles.planWas}>  {p.was}</Text>}
                      </Text>
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

          {/* Student discount: switches the plan cards to their student prices (from plan_prices) */}
          {hasStudentPrices && (
            <NeoBox style={styles.discount}>
              <Text style={styles.discountText}>Student discount</Text>
              <Toggle value={studentDiscount} onChange={setStudentDiscount} label="Student discount" />
            </NeoBox>
          )}

          <NeoButton
            label="Go Premium!"
            onPress={goPremium}
            backgroundColor={colors.wordmark}
            textColor={colors.white}
            shadowColor={colors.tealDark}
            textVariant="heading"
            contentStyle={{ paddingVertical: 15 }}
          />
            </>
          )}

          <View style={styles.footer}>
            {!sub.isPremium && (
              <Text style={styles.renews}>
                {selected
                  ? `One-time payment of ${money(total, selected.currency)} for ${periodText(selected)}. No automatic charges.`
                  : 'One-time payment. No automatic charges.'}
              </Text>
            )}
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

      <PaymentSheet
        visible={checkoutOpen}
        plan={{
          name: selected?.label ?? '',
          period: selected ? periodText(selected) : '',
          price: selected ? money(selected.price, selected.currency) : '',
          total: selected ? money(total, selected.currency) : '',
          discount: useStudent ? `−${money((selected?.price ?? 0) - total, selected?.currency)}` : null,
        }}
        onClose={() => !paying && setCheckoutOpen(false)}
        onContinue={continueToPayPal}
        busy={paying}
      />
    </View>
  );
}

const dateText = premiumDateText;

/** Shown instead of the plans when Supabase says the user already has Premium. */
function PremiumStatus({ sub, now }: { sub: PremiumInfo; now: number }) {
  const line = !sub.expiresAt
    ? 'Premium is active.'
    : sub.canceled
      ? `Your subscription was canceled. Premium ends ${premiumDateTimeText(sub.expiresAt)}.`
      : `Premium is on until ${premiumDateTimeText(sub.expiresAt)}.`;
  return (
    <NeoBox backgroundColor={colors.white} shadowColor={colors.tealDark} offset={4} style={styles.status}>
      <View style={styles.statusHead}>
        <Icon name="crown" size={22} color={colors.ink} fill={colors.gold} strokeWidth={1.4} />
        <Text style={styles.statusTitle}>You&apos;re Premium</Text>
      </View>
      {sub.expiresAt ? <Text style={styles.statusLeft}>{timeLeftText(sub.expiresAt, now)}</Text> : null}
      <Text style={styles.statusLine}>{line}</Text>
    </NeoBox>
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

const RETI_W = 54;
const RUN_LEG_MS = 2600; // one trip from one side to the other
const STEP_MS = 170; // one bounce of a running step
const CROWN_LEAD = 0.22; // how far ahead the crown is, in trips (1 = a whole side-to-side run)
const HOP_MS = 280; // half of one crown bounce (up, then down)

/**
 * Small Reti chasing a bouncing crown back and forth under the title, without stopping.
 * The crown hops ahead; Reti leans into the run, turns at each side and bobs with every step.
 * Both stay still in the middle when Reduce Motion is on.
 */
function RunningReti() {
  const { width } = useWindowDimensions();
  const range = Math.max(0, width / 2 - RETI_W / 2 - 28); // how far from the middle he runs
  const [run] = useState(() => new Animated.Value(0.5)); // 0 → 1 = left → right, 1 → 2 = right → left
  const [step] = useState(() => new Animated.Value(0));
  const [hop] = useState(() => new Animated.Value(0));
  // The crown runs the same laps, a little ahead of Reti.
  const [crownRun] = useState(() => Animated.modulo(Animated.add(run, CROWN_LEAD), 2));

  useEffect(() => {
    const loops: Animated.CompositeAnimation[] = [];
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce || cancelled) return;
      // Start from the middle heading right, then loop full laps.
      const lap = Animated.loop(
        Animated.sequence([
          Animated.timing(run, { toValue: 2, duration: RUN_LEG_MS * 1.5, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(run, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(run, { toValue: 0.5, duration: RUN_LEG_MS / 2, easing: Easing.linear, useNativeDriver: true }),
        ]),
      );
      const bob = Animated.loop(
        Animated.sequence([
          Animated.timing(step, { toValue: 1, duration: STEP_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(step, { toValue: 0, duration: STEP_MS, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
      );
      const bounce = Animated.loop(
        Animated.sequence([
          Animated.timing(hop, { toValue: 1, duration: HOP_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(hop, { toValue: 0, duration: HOP_MS, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
      );
      loops.push(lap, bob, bounce);
      loops.forEach((l) => l.start());
    });
    return () => {
      cancelled = true;
      loops.forEach((l) => l.stop());
    };
  }, [run, step, hop]);

  const turn = [0, 0.999, 1, 1.999, 2];
  return (
    <View style={styles.runway} pointerEvents="none">
      <Animated.View
        accessible
        accessibilityLabel="Crown"
        style={[
          styles.crown,
          {
            transform: [
              { translateX: crownRun.interpolate({ inputRange: [0, 1, 2], outputRange: [-range, range, -range] }) },
              { translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -24] }) },
              { rotate: hop.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '8deg'] }) },
            ],
          },
        ]}>
        <Icon name="crown" size={28} color={colors.ink} fill={colors.gold} strokeWidth={1.4} />
      </Animated.View>
      <Animated.Image
        source={MASCOT}
        accessibilityLabel="Reti the ghost running"
        style={[
          styles.reti,
          {
            transform: [
              { translateX: run.interpolate({ inputRange: [0, 1, 2], outputRange: [-range, range, -range] }) },
              { translateY: step.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
              { scaleX: run.interpolate({ inputRange: turn, outputRange: [1, 1, -1, -1, 1] }) },
              { rotate: '10deg' }, // leans forward; the flip above mirrors it when he runs left
            ],
          },
        ]}
      />
    </View>
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
  hero: { alignItems: 'center', gap: 4, paddingBottom: 24 },
  backWrap: { position: 'absolute', left: 20 },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  titleWrap: { marginTop: 6 },
  runway: { alignSelf: 'stretch', alignItems: 'center', height: 74, justifyContent: 'flex-end', marginTop: 4 },
  reti: { width: RETI_W, height: 63, resizeMode: 'contain' },
  crown: { position: 'absolute', bottom: 6, zIndex: 1 }, // on top, so it hops over Reti when they cross at a wall
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
  planWas: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textDecorationLine: 'line-through' },
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
  status: { padding: 20, gap: 6, borderColor: colors.tealDark, borderWidth: 3 },
  statusHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusTitle: { fontFamily: fonts.semiBold, fontSize: 20, color: colors.ink },
  statusLeft: { fontFamily: fonts.semiBold, fontSize: 22, color: colors.tealDark },
  statusLine: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  renews: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center' },
  links: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  link: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.ink, textDecorationLine: 'underline' },
  linkDot: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.muted },
});
