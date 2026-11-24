import { useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { TextField } from '@/components/ui/TextField';
import { colors } from '@/theme';

type Props = Omit<React.ComponentProps<typeof TextField>, 'secureTextEntry' | 'right'>;

/** Password input with an eye button that shows or hides what's typed. */
export function PasswordField(props: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      placeholder="••••••••"
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!visible}
      // Shown on Android: no suggestion bar, so the keyboard can't sneak in a word + space.
      keyboardType={visible && Platform.OS === 'android' ? 'visible-password' : 'default'}
      spellCheck={false}
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

const styles = StyleSheet.create({
  eye: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});
