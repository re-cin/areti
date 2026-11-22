import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { Wordmark } from '@/components/brand/Wordmark';
import { Icon } from '@/components/ui/Icon';
import { NeoButton } from '@/components/ui/NeoButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextField } from '@/components/ui/TextField';
import { AuthError, signIn, signUp } from '@/db/queries/accounts';
import { colors, fonts } from '@/theme';

const MASCOT = require('../../assets/images/areti-mascot.png');

const MODES = ['Sign In', 'Sign Up'] as const;
type Mode = (typeof MODES)[number];

/** How far the curved bottom of the teal header dips below its straight sides. */
const CURVE_DEPTH = 60;
const MIN_PASSWORD = 8;

/**
 * Sign In / Sign Up (email only; Google and Apple are left out for now).
 * Accounts are stored locally in SQLite (see src/db/queries/accounts.ts).
 */
export default function Auth() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [headerHeight, setHeaderHeight] = useState(0);

  const [mode, setMode] = useState<Mode>('Sign In');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === 'Sign Up';

  // Arrival: everything fades (and slides slightly) in. When coming from the onboarding
  // animation, Reti is already standing in this exact spot, so it stays solid.
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromOnboarding = from === 'onboarding';
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return fade.setValue(1);
      Animated.timing(fade, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    });
  }, [fade]);
  const fadeStyle = { opacity: fade };
  const riseStyle = {
    opacity: fade,
    transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setPassword('');
    setConfirm('');
  };

  const submit = async () => {
    if (busy) return;
    const problem = validate({ email, password, confirm, isSignUp });
    setError(problem);
    if (problem) return;

    setBusy(true);
    try {
      if (isSignUp) await signUp(email, password);
      else await signIn(email, password);
      router.replace('/planner');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };


  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {/* Teal header: mascot + wordmark */}
        <View
          style={[styles.header, { paddingTop: insets.top + 14 }]}
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
          {headerHeight > 0 && (
            <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]} pointerEvents="none">
              <Svg width={width} height={headerHeight}>
                <Path d={headerPath(width, headerHeight)} fill={colors.welcomeTeal} />
              </Svg>
            </Animated.View>
          )}
          <Animated.Image
            source={MASCOT}
            style={[styles.mascot, fromOnboarding ? null : fadeStyle]}
            accessibilityLabel="Reti the ghost"
          />
          <Animated.View style={[styles.wordmark, fadeStyle]}>
            <Wordmark width={133} backgroundColor={colors.welcomeTeal} />
          </Animated.View>
        </View>

        {/* Form */}
        <Animated.View style={[styles.form, riseStyle]}>
          <SegmentedControl options={MODES} value={mode} onChange={switchMode} />

          <Text style={[styles.label, styles.firstLabel]}>Email address</Text>
          <TextField
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
          />

          <View style={styles.labelRow}>
            <Text style={styles.label}>{isSignUp ? 'New password' : 'Password'}</Text>
            {!isSignUp && (
              <Pressable
                hitSlop={8}
                onPress={() => Alert.alert('Forgot password', 'Password reset is coming soon.')}>
                <Text style={styles.forgot}>Forgot?</Text>
              </Pressable>
            )}
          </View>
          <PasswordField
            value={password}
            onChangeText={setPassword}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            textContentType={isSignUp ? 'newPassword' : 'password'}
            returnKeyType={isSignUp ? 'next' : 'done'}
            onSubmitEditing={isSignUp ? undefined : submit}
          />

          {isSignUp && (
            <>
              <Text style={styles.label}>Re-enter password</Text>
              <PasswordField
                value={confirm}
                onChangeText={setConfirm}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={submit}
              />
            </>
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <NeoButton
            label={busy ? (isSignUp ? 'Creating account…' : 'Signing in…') : mode}
            disabled={busy}
            onPress={submit}
            backgroundColor={colors.buttonPeach}
            textVariant="heading"
            contentStyle={styles.buttonFace}
            style={styles.button}
          />
        </Animated.View>

        <View style={styles.spacer} />

        {/* Legal */}
        <Animated.Text style={[styles.legal, { paddingBottom: Math.max(insets.bottom, 16) }, fadeStyle]}>
          By continuing, you agree to our{' '}
          {/* TODO: link these once the pages exist. */}
          <Text style={styles.legalLink}>Terms of Service</Text> and{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>.
        </Animated.Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Password input with an eye button that shows or hides what's typed. */
function PasswordField(props: Omit<React.ComponentProps<typeof TextField>, 'secureTextEntry' | 'right'>) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      placeholder="••••••••"
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!visible}
      right={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={10}
          style={styles.eye}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}>
          <Icon name={visible ? 'eye-off' : 'eye'} size={20} color={colors.muted} />
        </Pressable>
      }
    />
  );
}

function validate({
  email,
  password,
  confirm,
  isSignUp,
}: {
  email: string;
  password: string;
  confirm: string;
  isSignUp: boolean;
}): string | null {
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Enter a valid email address.';
  if (!password) return 'Enter your password.';
  if (isSignUp && password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters for your password.`;
  if (isSignUp && password !== confirm) return "Passwords don't match.";
  return null;
}

function errorMessage(e: unknown) {
  if (e instanceof AuthError) {
    return e.code === 'email-taken'
      ? 'An account with this email already exists. Sign in instead.'
      : 'Wrong email or password.';
  }
  return 'Something went wrong. Please try again.';
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
    paddingBottom: 56,
  },
  mascot: {
    width: 105,
    height: 123,
  },
  wordmark: {
    marginTop: -2,
  },
  form: {
    paddingHorizontal: 22,
    paddingTop: 24,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.ink,
    marginTop: 16,
    marginBottom: 7,
  },
  firstLabel: {
    marginTop: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  forgot: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.terracottaDark,
    marginBottom: 7,
  },
  eye: {
    paddingHorizontal: 4,
    paddingVertical: 4,
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
  spacer: {
    flex: 1,
    minHeight: 32,
  },
  legal: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkSoft,
    textAlign: 'center',
    paddingHorizontal: 48,
  },
  legalLink: {
    fontFamily: fonts.semiBold,
    color: colors.ink,
    textDecorationLine: 'underline',
  },
});
