import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { NewSubjectSheet } from '@/components/planner/NewSubjectSheet';
import { EditNameModal } from '@/components/settings/EditNameModal';
import { SettingsScaffold } from '@/components/settings/SettingsScaffold';
import { SubjectColorModal } from '@/components/settings/SubjectColorModal';
import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { Pill } from '@/components/ui/Pill';
import { Text } from '@/components/ui/Text';
import { useDbQuery } from '@/lib/useDbQuery';
import { deleteSubject, listSubjects, renameSubject, setSubjectColor, type SubjectRow } from '@/features/subjects/subjectsRepo';
import { showNotice } from '@/stores/notice';
import { bumpData } from '@/stores/dataVersion';
import { borders, colors, fonts, spacing } from '@/theme';

/** Settings > Subjects (Figma "Subjects"): one card per subject with color, rename and delete. */
export default function SubjectsScreen() {
  const subjects = useDbQuery(listSubjects, [] as SubjectRow[]);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<SubjectRow | null>(null);
  const [coloring, setColoring] = useState<SubjectRow | null>(null);

  const remove = (s: SubjectRow) =>
    // areti's white popup: white Cancel, terracotta Delete.
    showNotice({
      title: `Delete ${s.name}?`,
      message: 'Its tasks, scheduled Pomodoro sessions and exam dates are removed too. Past focus time stays in your statistics.',
      cancelLabel: 'Cancel',
      buttonLabel: 'Delete',
      onPress: () => void deleteSubject(s.id),
    });

  const saveName = async (name: string) => {
    const s = renaming;
    setRenaming(null);
    if (!s || name === s.name) return;
    if (subjects.some((o) => o.id !== s.id && o.name.toLowerCase() === name.toLowerCase())) {
      setTimeout(() => showNotice({ title: 'Already added', message: `You already have ${name}.` }), 300);
      return;
    }
    await renameSubject(s.id, name);
  };

  return (
    <View style={{ flex: 1 }}>
      <SettingsScaffold title="Subjects">
        {/* Header: "Manage Subjects ...... 3 Total" with a thin rule */}
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 18 }}>Manage Subjects</Text>
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 14 }} color={colors.terracottaDark}>
              {subjects.length} Total
            </Text>
          </View>
          <View style={{ height: 1.5, backgroundColor: colors.mutedSoft }} />
        </View>

        {subjects.length === 0 && <Text color={colors.muted}>No subjects yet. Add your first one below.</Text>}

        <View style={{ gap: spacing.md }}>
          {subjects.map((s) => (
            <NeoBox key={s.id} offset={3} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: spacing.md, gap: spacing.sm }}>
              {/* Drag handle (reordering comes later) */}
              <MaterialIcons name="drag-indicator" size={20} color={colors.mutedSoft} />
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <Pill label={s.name} color={s.color} />
              </View>
              <RoundButton
                backgroundColor={s.color}
                accessibilityLabel={`Change ${s.name} color`}
                onPress={() => setColoring(s)}
                icon={<Ionicons name="color-palette-outline" size={16} color={colors.ink} />}
              />
              <RoundButton
                backgroundColor={colors.surface}
                accessibilityLabel={`Rename ${s.name}`}
                onPress={() => setRenaming(s)}
                icon={<Ionicons name="pencil" size={14} color={colors.ink} />}
              />
              <RoundButton
                backgroundColor={colors.dangerSoft}
                accessibilityLabel={`Delete ${s.name}`}
                onPress={() => remove(s)}
                icon={<Ionicons name="trash-outline" size={15} color={colors.dangerDark} />}
              />
            </NeoBox>
          ))}
        </View>

        <NeoButton
          label="Add Subject"
          backgroundColor={colors.teal}
          icon={<Ionicons name="add-circle-outline" size={20} color={colors.ink} />}
          onPress={() => setAdding(true)}
        />
      </SettingsScaffold>

      <EditNameModal
        visible={renaming !== null}
        title="Rename subject"
        placeholder="Subject name"
        initialName={renaming?.name ?? ''}
        onCancel={() => setRenaming(null)}
        onSave={saveName}
      />

      <SubjectColorModal
        visible={coloring !== null}
        subjectName={coloring?.name ?? ''}
        current={coloring?.color ?? ''}
        onClose={() => setColoring(null)}
        onPick={(c) => {
          const s = coloring;
          setColoring(null);
          if (s && c !== s.color) void setSubjectColor(s.id, c);
        }}
      />

      {/* Same sheet as Planner > Add Task > "+ New Sub" (name, color, difficulty, exam date) */}
      <NewSubjectSheet visible={adding} onClose={() => setAdding(false)} onCreated={() => {
          setAdding(false);
          bumpData(); // refresh this list (the sheet saves through the Planner's query)
        }}
      />
    </View>
  );
}

/** Small round outlined button with a hard shadow (color, rename, delete). */
function RoundButton({
  icon,
  backgroundColor,
  onPress,
  accessibilityLabel,
}: {
  icon: React.ReactNode;
  backgroundColor: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={4} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      {({ pressed }) => (
        <View style={{ transform: pressed ? [{ translateX: 2 }, { translateY: 2 }] : [] }}>
          <NeoBox shadow={!pressed} offset={2} radius={15} backgroundColor={backgroundColor} style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderWidth: borders.thin }}>
            {icon}
          </NeoBox>
        </View>
      )}
    </Pressable>
  );
}
