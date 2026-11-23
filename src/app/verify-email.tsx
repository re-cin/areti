import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { NeoButton } from '@/components/ui/NeoButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextField } from '@/components/ui/TextField';
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';
import { AuthError, resendSignUpCode, verifySignUpCode } from '@/lib/auth';
import { showWelcome } from '@/lib/welcome';
import { colors, fonts, spacing } from '@/theme';

/** Seconds before "Resend code" can be used again (Supabase also limits how often it emails). */
const RESEND_AFTER = 60;

/**
 * Sign Up, step 2: Supabase emailed a code to the new account's address.
 * Entering it confirms the email and signs in. Opened from app/auth.tsx with ?email=.
 */
export default function VerifyEmail() {
  const insets = useSafeAreaInsets();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const { scrollRef, onScroll, onFocus, keyboardPadding } = useKeyboardAwareScroll();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_AFTER); // a code was just sent

  // Countdown for "Resend code".
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const verify = async () => {
    if (busy) return;
    const digits = code.replace(/\s/g, '');
    if (!/^\d{6,10}$/.test(digits)) return setError('Enter the code from the email.');
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await verifySignUpCode(email, digits);
      if (router.canDismiss()) router.dismissAll();
      router.replace('/planner'); // confirmed and signed in
      showWelcome('new-account');
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const resend = async () => {
    if (busy || resendIn > 0) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await resendSignUpCode(email);
      setCode('');
      setResendIn(RESEND_AFTER);
      setInfo('New code sent. Use the newest email.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl + keyboardPadding },
        ]}>
        <ScreenHeader title="Confirm Email" leading="back" />

        <View>
          <Text style={styles.intro}>
            We sent a code to <Text style={styles.strong}>{email}</Text>. Enter it below to finish creating your account.
            Check your spam folder if you don&apos;t see it.
          </Text>

          <Text style={styles.label}>Code</Text>
          <TextField
            value={code}
            onChangeText={(t) => {
              setCode(t);
              setError(null);
            }}
            onFocus={onFocus}
            placeholder="123456"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={10}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={verify}
          />

          {error && <Text style={styles.error}>{error}</Text>}
          {info && !error && <Text style={styles.info}>{info}</Text>}

          <NeoButton
            label={busy ? 'Checking…' : 'Confirm'}
            disabled={busy}
            onPress={verify}
            backgroundColor={colors.buttonPeach}
            textVariant="heading"
            contentStyle={styles.buttonFace}
            style={styles.button}
          />

          <View style={styles.links}>
            <Pressable onPress={resend} disabled={resendIn > 0 || busy} hitSlop={8}>
              <Text style={[styles.link, (resendIn > 0 || busy) && styles.linkDisabled]}>
                {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
              </Text>
            </Pressable>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.link}>Use a different email</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function errorMessage(e: unknown) {
  if (!(e instanceof AuthError)) return 'Something went wrong. Please try again.';
  switch (e.code) {
    case 'wrong-code':
      return 'That code is wrong or has expired. Check the email or tap Resend code.';
    case 'rate-limited':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'offline':
      return "Can't reach the server. Check your internet connection and try again.";
    case 'not-configured':
      return 'Accounts are not set up yet (missing Supabase settings in .env).';
    default:
      return e.message || 'Something went wrong. Please try again.';
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.splash,
  },
  content: {
    paddingHorizontal: 22,
    gap: spacing.lg,
  },
  intro: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkSoft,
  },
  strong: {
    fontFamily: fonts.semiBold,
    color: colors.ink,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.ink,
    marginTop: 16,
    marginBottom: 7,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.dangerDark,
    marginTop: 10,
  },
  info: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: 10,
  },
  button: {
    marginTop: 20,
  },
  buttonFace: {
    paddingVertical: 13,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  link: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.ink,
    textDecorationLine: 'underline',
  },
  linkDisabled: {
    color: colors.muted,
    textDecorationLine: 'none',
  },
});
