import { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { SettingsScaffold } from '@/components/settings/SettingsScaffold';
import { IconButton } from '@/components/ui/IconButton';
import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { Pill } from '@/components/ui/Pill';
import { Text } from '@/components/ui/Text';
import { useDbQuery } from '@/lib/useDbQuery';
import { addSubject, deleteSubject, listSubjects, type SubjectRow } from '@/features/subjects/subjectsRepo';
import { borders, colors, fonts, radii, spacing } from '@/theme';

// Minimal subjects manager so the timer and statistics have something to show.
// Difficulty / urgency editing belongs to the planner work (docs/planner-rules.md).
export default function SubjectsScreen() {
  const subjects = useDbQuery(listSubjects, [], [] as SubjectRow[]);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(colors.subjectPalette[0]);

  const add = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (subjects.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Already added', `You already have ${trimmed}.`);
      return;
    }
    await addSubject(trimmed, color);
    setName('');
    setColor(colors.subjectPalette[(subjects.length + 1) % colors.subjectPalette.length]);
  };

  const remove = (s: SubjectRow) =>
    Alert.alert(`Delete ${s.name}?`, 'Its upcoming planned sessions are removed. Past focus time stays in your statistics.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteSubject(s.id) },
    ]);

  return (
    <SettingsScaffold title="Subjects">
      <NeoBox style={{ padding: spacing.lg, gap: spacing.md }}>
        <Text style={{ fontFamily: fonts.semiBold, fontSize: 17 }}>Add a subject</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={add}
          placeholder="e.g. Physics"
          placeholderTextColor={colors.mutedSoft}
          returnKeyType="done"
          maxLength={24}
          style={{
            fontFamily: fonts.medium,
            fontSize: 16,
            color: colors.ink,
            borderWidth: borders.thin,
            borderColor: colors.ink,
            borderRadius: radii.tile,
            backgroundColor: colors.white,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {colors.subjectPalette.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              accessibilityRole="radio"
              accessibilityState={{ selected: color === c }}
              accessibilityLabel={`Color ${c}`}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: c,
                borderWidth: color === c ? 3 : borders.thin,
                borderColor: colors.ink,
              }}
            />
          ))}
        </View>
        {name.trim() !== '' && <Pill label={name.trim()} color={color} />}
        <NeoButton label="Add subject" backgroundColor={colors.teal} onPress={add} disabled={!name.trim()} />
      </NeoBox>

      <Text style={{ fontFamily: fonts.semiBold }} color={colors.muted}>
        Your subjects
      </Text>
      {subjects.length === 0 ? (
        <Text color={colors.muted}>No subjects yet.</Text>
      ) : (
        <NeoBox style={{ paddingHorizontal: spacing.lg }}>
          {subjects.map((s, i) => (
            <View
              key={s.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing.md,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.line,
              }}>
              <View style={{ flex: 1 }}>
                <Pill label={s.name} color={s.color} />
              </View>
              <IconButton icon="trash" size={34} backgroundColor={colors.dangerSoft} accessibilityLabel={`Delete ${s.name}`} onPress={() => remove(s)} />
            </View>
          ))}
        </NeoBox>
      )}
    </SettingsScaffold>
  );
}
