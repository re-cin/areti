import { useEffect, useState } from 'react';
import { Animated, BackHandler, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { colors, fonts } from '@/theme';

export type CheckoutPlan = {
  /** e.g. "Yearly plan" */
  name: string;
  /** e.g. "1 year" */
  period: string;
  /** Full price, e.g. "₱1,199" */
  price: string;
  /** What is charged after any discount. */
  total: string;
  /** e.g. "−₱100" for the student price, or null when it doesn't apply. */
  discount: string | null;
};

type Props = {
  visible: boolean;
  plan: CheckoutPlan;
  onClose: () => void;
  /** Starts PayPal checkout. */
  onContinue: () => void;
  busy?: boolean;
};

/**
 * Checkout bottom sheet opened by "Go Premium!": plan summary, PayPal as the payment method,
 * and "Continue to PayPal". Payment itself happens on PayPal's own page (never inside areti),
 * and Premium is switched on by the server after PayPal confirms it.
 */
export function PaymentSheet({ visible, plan, onClose, onContinue, busy = false }: Props) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [progress] = useState(() => new Animated.Value(0));
  // Mount as soon as it opens; unmount only after the closing slide finishes.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      Animated.timing(progress, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, progress]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close checkout" />
      </Animated.View>

      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + 20 },
          { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [520, 0] }) }] },
        ]}>
        <View style={styles.handle} />
        <Text style={styles.title} accessibilityRole="header">
          Checkout
        </Text>
        <Text style={styles.subtitle}>Review your plan before paying.</Text>

        {/* Order summary */}
        <NeoBox backgroundColor={colors.white} style={styles.summary}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.item}>areti Premium</Text>
              <Text style={styles.itemSub}>
                {plan.name} · {plan.period}
              </Text>
            </View>
            <Text style={styles.amount}>{plan.price}</Text>
          </View>
          {plan.discount && (
            <View style={styles.row}>
              <Text style={[styles.itemSub, { flex: 1 }]}>Student price</Text>
              <Text style={styles.discount}>{plan.discount}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={[styles.total, { flex: 1 }]}>Total</Text>
            <Text style={styles.total}>{plan.total}</Text>
          </View>
        </NeoBox>

        {/* Payment method */}
        <Text style={styles.label}>Pay with</Text>
        <NeoBox backgroundColor={colors.white} shadowColor={colors.tealDark} offset={3} style={styles.method}>
          <View style={styles.radio}>
            <View style={styles.radioDot} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.item}>PayPal</Text>
            <Text style={styles.itemSub}>Your PayPal balance, bank or card</Text>
          </View>
        </NeoBox>

        <NeoButton
          label={busy ? 'Opening PayPal…' : 'Continue to PayPal'}
          onPress={onContinue}
          disabled={busy}
          backgroundColor={colors.wordmark}
          textColor={colors.white}
          shadowColor={colors.tealDark}
          textVariant="heading"
          contentStyle={{ paddingVertical: 15 }}
          style={{ marginTop: 6 }}
        />

        <Text style={styles.note}>
          You&apos;ll finish paying on PayPal&apos;s secure page; areti never sees your card details.
          {'\n'}One-time payment for {plan.period}. No automatic charges.
        </Text>

        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(17,17,17,0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.splash,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.ink,
    paddingTop: 10,
    paddingHorizontal: 20,
    gap: 12,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.mutedSoft, marginBottom: 6 },
  title: { fontFamily: fonts.semiBold, fontSize: 24, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, marginTop: -8 },
  summary: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  item: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.ink },
  itemSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  amount: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.ink },
  discount: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.tealDark },
  divider: { height: 1.5, backgroundColor: colors.divider },
  total: { fontFamily: fonts.semiBold, fontSize: 18, color: colors.ink },
  label: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.muted, marginTop: 4 },
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderColor: colors.tealDark, borderWidth: 3 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink },
  note: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted, textAlign: 'center' },
  cancel: { alignSelf: 'center', paddingVertical: 4 },
  cancelText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.ink, textDecorationLine: 'underline' },
});
