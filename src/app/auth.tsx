import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
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
import { PasswordField } from '@/components/auth/PasswordField';
import { Wordmark } from '@/components/brand/Wordmark';
import { NeoButton } from '@/components/ui/NeoButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextField } from '@/components/ui/TextField';
import {
  AuthError,
  cleanPassword,
  isUsernameAvailable,
  MIN_PASSWORD_LENGTH,
  resendSignUpCode,
  signIn,
  signInWithUsername,
  signUp,
} from '@/lib/auth';
import { looksLikeEmail, usernameProblem } from '@/lib/username';
import { showWelcome } from '@/lib/welcome';
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';
import { colors, fonts } from '@/theme';

const MASCOT = require('../../assets/images/areti-mascot.png');

const MODES = ['Sign In', 'Sign Up'] as const;
type Mode = (typeof MODES)[number];

/** How far the curved bottom of the teal header dips below its straight sides. */
const CURVE_DEPTH = 60;
const MIN_PASSWORD = MIN_PASSWORD_LENGTH;

/**
 * Sign In / Sign Up (email only; Google and Apple are left out for now).
 * Accounts are stored locally in SQLite (see src/db/queries/accounts.ts).
 */
export default function Auth() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [headerHeight, setHeaderHeight] = useState(0);

  const [mode, setMode] = useState<Mode>('Sign In');
  // Sign Up: the email. Sign In: the email or the username.
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [nameCheck, setNameCheck] = useState<'idle' | 'checking' | 'free' | 'taken'>('idle');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === 'Sign Up';

  // Sign Up: check the username with Supabase a moment after the user stops typing.
  useEffect(() => {
    if (!isSignUp || usernameProblem(username)) return;
    let alive = true;
    const t = setTimeout(() => {
      setNameCheck('checking');
      isUsernameAvailable(username)
        .then((free) => alive && setNameCheck(free ? 'free' : 'taken'))
        .catch(() => alive && setNameCheck('idle')); // offline: checked again when signing up
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [username, isSignUp]);
  // Keep the focused field visible above the phone keyboard.
  const { scrollRef, onScroll, onFocus, keyboardPadding } = useKeyboardAwareScroll();

  // Arrival: everything fades (and slides slightly) in. When coming from the onboarding
  // animation, Reti is already standing in this exact spot, so it stays solid.
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromOnboarding = from === 'onboarding';
  const [fade] = useState(() => new Animated.Value(0));
  // Reti floats gently up and down (same as the Welcome page). Starts at rest, so the
  // hand-off from the onboarding animation stays seamless.
  const [float] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return fade.setValue(1);
      Animated.timing(fade, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(float, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(float, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => loop?.stop();
  }, [fade, float]);
  const fadeStyle = { opacity: fade };
  const floatStyle = { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] };
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
    const problem = validate({ email, username, password, confirm, isSignUp }) ?? (isSignUp && nameCheck === 'taken' ? errorMessage(new AuthError('username-taken')) : null);
    setError(problem);
    if (problem) return;

    setBusy(true);
    const started = Date.now();
    try {
      if (isSignUp) await signUp(email, password, username);
      else if (looksLikeEmail(email)) await signIn(email, password);
      else await signInWithUsername(email, password);
      if (__DEV__) console.log(`[auth] ${isSignUp ? 'sign up' : 'sign in'} took ${Date.now() - started} ms`);
      if (isSignUp) {
        router.replace('/welcome'); // new account: welcome page, then the Planner
      } else {
        router.replace('/planner');
        showWelcome();
      }
    } catch (e) {
      if (e instanceof AuthError && e.code === 'confirm-email') {
        // Sign up: Supabase just emailed the code. Sign in before confirming: send a fresh one.
        // (After a username sign-in the server tells us the account's email.)
        const address = e.email ?? email.trim();
        if (!isSignUp) await resendSignUpCode(address).catch(() => {});
        router.push({ pathname: '/verify-email', params: { email: address } });
        return;
      }
      if (e instanceof AuthError && e.code === 'username-taken') setNameCheck('taken');
      setError(errorMessage(e, isSignUp));
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
        contentContainerStyle={[styles.content, { paddingBottom: keyboardPadding }]}
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
            style={[styles.mascot, fromOnboarding ? null : fadeStyle, floatStyle]}
            accessibilityLabel="Reti the ghost"
          />
          <Animated.View style={[styles.wordmark, fadeStyle]}>
            <Wordmark width={133} backgroundColor={colors.welcomeTeal} />
          </Animated.View>
        </View>

        {/* Form */}
        <Animated.View style={[styles.form, riseStyle]}>
          <SegmentedControl options={MODES} value={mode} onChange={switchMode} />

          {isSignUp && (
            <>
              <Text style={[styles.label, styles.firstLabel]}>Username</Text>
              <TextField
                onFocus={onFocus}
                value={username}
                onChangeText={(t) => {
                  setUsername(t.replace(/\s/g, ''));
                  setNameCheck('idle');
                  setError(null);
                }}
                placeholder="e.g. ryan_b"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username-new"
                textContentType="username"
                maxLength={20}
                returnKeyType="next"
              />
              <UsernameHint username={username} check={nameCheck} />
            </>
          )}

          <Text style={[styles.label, isSignUp ? null : styles.firstLabel]}>
            {isSignUp ? 'Email address' : 'Email or username'}
          </Text>
          <TextField
            onFocus={onFocus}
            value={email}
            onChangeText={(t) => { setEmail(t); setError(null); }}
            placeholder={isSignUp ? 'you@example.com' : 'you@example.com or username'}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={isSignUp ? 'email' : 'username'}
            textContentType={isSignUp ? 'emailAddress' : 'username'}
            returnKeyType="next"
          />

          <View style={styles.labelRow}>
            <Text style={styles.label}>{isSignUp ? 'New password' : 'Password'}</Text>
            {!isSignUp && (
              <Pressable
                hitSlop={8}
                onPress={() => router.push({ pathname: '/forgot-password', params: { email } })}>
                <Text style={styles.forgot}>Forgot?</Text>
              </Pressable>
            )}
          </View>
          <PasswordField
            onFocus={onFocus}
            value={password}
            onChangeText={(t) => { setPassword(t); setError(null); }}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            textContentType={isSignUp ? 'newPassword' : 'password'}
            returnKeyType={isSignUp ? 'next' : 'done'}
            onSubmitEditing={isSignUp ? undefined : submit}
          />

          {isSignUp && (
            <>
              <Text style={styles.label}>Re-enter password</Text>
              <PasswordField
                onFocus={onFocus}
                value={confirm}
                onChangeText={(t) => { setConfirm(t); setError(null); }}
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
    </View>
  );
}

/** Under the Username field: the rules, or whether the username is free. */
function UsernameHint({ username, check }: { username: string; check: 'idle' | 'checking' | 'free' | 'taken' }) {
  const problem = username ? usernameProblem(username) : null;
  const [text, color] = !username
    ? ['3–20 characters: letters, numbers, _ and .', colors.inkSoft]
    : problem
      ? [problem, colors.dangerDark]
      : check === 'checking'
        ? ['Checking…', colors.inkSoft]
        : check === 'free'
          ? ['✓ Username is available', colors.tealDark]
          : check === 'taken'
            ? ['That username is taken. Try another one.', colors.dangerDark]
            : ['3–20 characters: letters, numbers, _ and .', colors.inkSoft];
  return (
    <Text style={[styles.hint, { color }]} accessibilityLiveRegion="polite">
      {text}
    </Text>
  );
}

function validate({
  email,
  username,
  password,
  confirm,
  isSignUp,
}: {
  email: string;
  username: string;
  password: string;
  confirm: string;
  isSignUp: boolean;
}): string | null {
  if (isSignUp) {
    const nameProblem = usernameProblem(username);
    if (nameProblem) return nameProblem;
  }
  const id = email.trim();
  if (!isSignUp && !id) return 'Enter your email or username.';
  if ((isSignUp || looksLikeEmail(id)) && !/^\S+@\S+\.\S+$/.test(id)) return 'Enter a valid email address.';
  const pw = cleanPassword(password);
  if (!pw) return 'Enter your password.';
  if (isSignUp && pw.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters for your password.`;
  if (isSignUp && pw !== cleanPassword(confirm)) return "Passwords don't match.";
  return null;
}

function errorMessage(e: unknown, isSignUp = true) {
  if (!(e instanceof AuthError)) return 'Something went wrong. Please try again.';
  switch (e.code) {
    case 'email-taken':
      return 'An account with this email already exists. Sign in instead.';
    case 'username-taken':
      return 'That username is taken. Try another one.';
    case 'wrong-credentials':
      return isSignUp ? 'Wrong email or password.' : 'Wrong email, username or password.';
    case 'confirm-email':
      return 'Enter the code we emailed you to finish creating your account.';
    case 'weak-password':
      return 'That password is too weak. Try a longer one with letters and numbers.';
    case 'offline':
      return "Can't reach the server. Check your internet connection and try again.";
    case 'not-configured':
      return 'Accounts are not set up yet (missing Supabase settings in .env).';
    default:
      return e.message || 'Something went wrong. Please try again.';
  }
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
  hint: {
    fontFamily: fonts.medium,
    fontSize: 12,
    marginTop: 6,
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
