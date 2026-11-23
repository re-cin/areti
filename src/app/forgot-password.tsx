import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { PasswordField } from '@/components/auth/PasswordField';
import { NeoButton } from '@/components/ui/NeoButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextField } from '@/components/ui/TextField';
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';
import { AuthError, cleanPassword, MIN_PASSWORD_LENGTH, resetPasswordWithCode, sendPasswordResetCode } from '@/lib/auth';
import { colors, fonts, spacing } from '@/theme';

/** Seconds before "Resend code" can be used again. */
const RESEND_AFTER = 60;

/**
 * Forgot Password with an emailed code:
 *  1. enter email → Supabase emails a reset code
 *  2. enter the code + a new password → password changed, signed in
 */
export default function ForgotPassword() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const { scrollRef, onScroll, onFocus, keyboardPadding } = useKeyboardAwareScroll();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  // Countdown for "Resend code".
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendCode = async () => {
    if (busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    setError(null);
    setBusy(true);
    try {
      await sendPasswordResetCode(email);
      setStep('code');
      setResendIn(RESEND_AFTER);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (busy) return;
    const digits = code.replace(/\s/g, '');
    if (!/^\d{6,10}$/.test(digits)) return setError('Enter the code from the email.');
    if (cleanPassword(password).length < MIN_PASSWORD_LENGTH) return setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your new password.`);
    if (cleanPassword(password) !== cleanPassword(confirm)) return setError("Passwords don't match.");
    setError(null);
    setBusy(true);
    try {
      await resetPasswordWithCode(email, digits, password);
      if (router.canDismiss()) router.dismissAll();
      router.replace('/planner'); // signed in with the new password
    } catch (e) {
      setError(errorMessage(e));
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
        <ScreenHeader title="Forgot Password" leading="back" />

        {step === 'email' ? (
          <View>
            <Text style={styles.intro}>Enter your account&apos;s email and we&apos;ll send you a code to reset your password.</Text>
            <Text style={styles.label}>Email address</Text>
            <TextField
              value={email}
              onChangeText={(t) => { setEmail(t); setError(null); }}
              onFocus={onFocus}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={sendCode}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <NeoButton
              label={busy ? 'Sending…' : 'Send code'}
              disabled={busy}
              onPress={sendCode}
              backgroundColor={colors.buttonPeach}
              textVariant="heading"
              contentStyle={styles.buttonFace}
              style={styles.button}
            />
          </View>
        ) : (
          <View>
            <Text style={styles.intro}>
              We sent a code to <Text style={styles.strong}>{email.trim()}</Text>. Enter it below with your new password.
              Check your spam folder if you don&apos;t see it.
            </Text>

            <Text style={styles.label}>Code</Text>
            <TextField
              value={code}
              onChangeText={(t) => { setCode(t); setError(null); }}
              onFocus={onFocus}
              placeholder="123456"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={10}
            />

            <Text style={styles.label}>New password</Text>
            <PasswordField
              value={password}
              onChangeText={(t) => { setPassword(t); setError(null); }}
              onFocus={onFocus}
              autoComplete="new-password"
              textContentType="newPassword"
            />

            <Text style={styles.label}>Re-enter password</Text>
            <PasswordField
              value={confirm}
              onChangeText={(t) => { setConfirm(t); setError(null); }}
              onFocus={onFocus}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={reset}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <NeoButton
              label={busy ? 'Resetting…' : 'Reset Password'}
              disabled={busy}
              onPress={reset}
              backgroundColor={colors.buttonPeach}
              textVariant="heading"
              contentStyle={styles.buttonFace}
              style={styles.button}
            />

            <View style={styles.links}>
              <Pressable onPress={sendCode} disabled={resendIn > 0 || busy} hitSlop={8}>
                <Text style={[styles.link, (resendIn > 0 || busy) && styles.linkDisabled]}>
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setStep('email');
                  setError(null);
                  setCode('');
                }}
                hitSlop={8}>
                <Text style={styles.link}>Use a different email</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function errorMessage(e: unknown) {
  if (!(e instanceof AuthError)) return 'Something went wrong. Please try again.';
  switch (e.code) {
    case 'wrong-code':
      return 'That code is wrong or has expired. Check the email or tap Resend code.';
    case 'same-password':
      return 'Your new password must be different from your old one.';
    case 'weak-password':
      return 'That password is too weak. Try a longer one with letters and numbers.';
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
