import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { TextField } from '@/components/ui/TextField';
import { colors, fonts, spacing } from '@/theme';

const CONFIRM_WORD = 'DELETE';

type Props = {
  visible: boolean;
  deleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Final check before deleting the account: the user must type DELETE. */
export function DeleteAccountModal({ visible, deleting, onCancel, onConfirm }: Props) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (visible) setText('');
  }, [visible]);

  const ready = text.trim() === CONFIRM_WORD && !deleting;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={deleting ? undefined : onCancel} accessibilityLabel="Close" />
        <NeoBox backgroundColor={colors.white} style={styles.card}>
          <Text style={styles.title}>Delete your account?</Text>
          <Text style={styles.body}>
            This permanently deletes your account, study streaks, tasks, focus history and profile picture on every
            phone. This cannot be undone.
          </Text>
          <Text style={styles.label}>
            Type <Text style={styles.word}>{CONFIRM_WORD}</Text> to confirm
          </Text>
          <TextField
            value={text}
            onChangeText={setText}
            placeholder={CONFIRM_WORD}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            editable={!deleting}
            returnKeyType="done"
            onSubmitEditing={() => ready && onConfirm()}
          />
          <View style={styles.buttons}>
            <NeoButton
              label="Cancel"
              onPress={onCancel}
              disabled={deleting}
              backgroundColor={colors.white}
              style={styles.button}
            />
            <NeoButton
              label={deleting ? 'Deleting…' : 'Delete'}
              icon="trash"
              onPress={onConfirm}
              disabled={!ready}
              backgroundColor={colors.terracotta}
              style={styles.button}
            />
          </View>
        </NeoBox>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,17,17,0.45)', // same dim as areti's other popups
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  // Same look as the other popups: white card, centered title and text.
  card: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.ink,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.muted,
    textAlign: 'center',
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.ink,
    marginTop: spacing.xs,
  },
  word: {
    fontFamily: fonts.semiBold,
    color: colors.terracottaDark,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  button: {
    flex: 1,
  },
});
