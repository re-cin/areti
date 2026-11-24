import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { colors, fonts } from '@/theme';

type Props = {
  name: string;
  maxLength: number;
  onRename: (name: string) => void;
  onOpenSettings: () => void;
};

/** "Customize" row with a Settings shortcut, and the ghost's name field. */
export function CustomizeSection({ name, maxLength, onRename, onOpenSettings }: Props) {
  const [draft, setDraft] = useState(name);
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  useEffect(() => setDraft(name), [name]);

  const commit = () => {
    const clean = draft.trim();
    if (clean && clean !== name) onRename(clean);
    else setDraft(name);
  };

  return (
    <View style={{ gap: 6 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Customize</Text>
        <Pressable onPress={onOpenSettings} style={styles.settingsButton} accessibilityRole="button" accessibilityLabel="Go to Settings">
          <Text style={styles.settingsText}>Go to Settings</Text>
          <Icon name="chevron-right" size={16} color={colors.pet.outline} strokeWidth={2.2} />
        </Pressable>
      </View>

      <TextField
        ref={input}
        value={draft}
        onChangeText={setDraft}
        onBlur={commit}
        onSubmitEditing={commit}
        maxLength={maxLength}
        returnKeyType="done"
        accessibilityLabel="Ghost name"
        style={styles.field}
        right={
          <Pressable onPress={() => input.current?.focus()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Edit name">
            <Icon name="pencil" size={18} color={colors.pet.outline} />
          </Pressable>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 39 },
  title: { fontFamily: fonts.semiBold, fontSize: 18, lineHeight: 28, letterSpacing: -0.45 },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1.5,
    borderColor: colors.pet.outline,
    borderRadius: 18,
    paddingLeft: 11.5,
    paddingRight: 6,
    height: 24,
  },
  settingsText: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 16, color: colors.pet.outline },
  field: { backgroundColor: colors.pet.lockedBg, borderColor: colors.pet.outline, borderRadius: 12, minHeight: 40 },
});
