import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { TextField } from '@/components/ui/TextField';
import { colors, fonts, spacing } from '@/theme';

const MAX_LENGTH = 40;

type Props = {
  visible: boolean;
  initialName: string;
  onCancel: () => void;
  onSave: (name: string) => void;
};

/** Small centered card for changing the display name. */
export function EditNameModal({ visible, initialName, onCancel, onSave }: Props) {
  const [name, setName] = useState(initialName);
  useEffect(() => {
    if (visible) setName(initialName);
  }, [visible, initialName]);

  const trimmed = name.trim();
  const save = () => trimmed && onSave(trimmed);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Close" />
        <NeoBox radius={20} backgroundColor={colors.surface} style={styles.card}>
          <Text style={styles.title}>Edit name</Text>
          <TextField
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoFocus
            autoCapitalize="words"
            maxLength={MAX_LENGTH}
            returnKeyType="done"
            onSubmitEditing={save}
          />
          <View style={styles.buttons}>
            <NeoButton label="Cancel" onPress={onCancel} backgroundColor={colors.surface} style={styles.button} />
            <NeoButton
              label="Save"
              onPress={save}
              disabled={!trimmed}
              backgroundColor={colors.buttonTeal}
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
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: colors.ink,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  button: {
    flex: 1,
  },
});
