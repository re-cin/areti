
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { NewSubjectSheet } from '@/components/planner/NewSubjectSheet';
import { EditNameModal } from '@/components/settings/EditNameModal';
import { SettingsScaffold } from '@/components/settings/SettingsScaffold';
import { SubjectColorModal } from '@/components/settings/SubjectColorModal';
import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { Pill } from '@/components/ui/Pill';
import { Text } from '@/components/ui/Text';
import {
  deleteSubject,
  listSubjects,
  renameSubject,
  setSubjectColor,
  type SubjectRow,
} from '@/features/subjects/subjectsRepo';
import { useDbQuery } from '@/lib/useDbQuery';
import { bumpData } from '@/stores/dataVersion';
import { showNotice } from '@/stores/notice';
import { borders, colors, fonts, spacing } from '@/theme';

/** Settings > Subjects */
export default function SubjectsScreen() {
  const subjects = useDbQuery(listSubjects, [] as SubjectRow[]);

  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<SubjectRow | null>(null);
  const [coloring, setColoring] = useState<SubjectRow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  const remove = (s: SubjectRow) =>
    showNotice({
      title: `Delete ${s.name}?`,
      message:
        'Its tasks, scheduled Pomodoro sessions and exam dates are removed too. Past focus time stays in your statistics.',
      cancelLabel: 'Cancel',
      buttonLabel: 'Delete',
      onPress: () => void deleteSubject(s.id),
    });

  const saveName = async (name: string) => {
    const s = renaming;
    setRenaming(null);

    if (!s || name === s.name) return;

    if (
      subjects.some(
        (o) =>
          o.id !== s.id &&
          o.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setTimeout(
        () =>
          showNotice({
            title: 'Already added',
            message: `You already have ${name}.`,
          }),
        300,
      );
      return;
    }

    await renameSubject(s.id, name);
  };

  return (
    <View style={{ flex: 1 }}>
      <SettingsScaffold title="Subjects">
        {/* Header */}
        <View style={{ gap: spacing.sm }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{
                fontFamily: fonts.semiBold,
                fontSize: 18,
              }}
            >
              Manage Subjects
            </Text>

            <Text
              style={{
                fontFamily: fonts.semiBold,
                fontSize: 14,
              }}
              color={colors.terracottaDark}
            >
              {subjects.length} Total
            </Text>
          </View>

          <View
            style={{
              height: 1.5,
              backgroundColor: colors.mutedSoft,
            }}
          />

          {/* Search bar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: borders.thin,
              borderColor: colors.ink,
              borderRadius: 12,
              backgroundColor: colors.surface,
              paddingHorizontal: spacing.md,
              gap: spacing.sm,
            }}
          >
            <Ionicons
              name="search-outline"
              size={20}
              color={colors.muted}
            />

            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search subjects..."
              placeholderTextColor={colors.muted}
              style={{
                flex: 1,
                paddingVertical: 12,
                color: colors.ink,
                fontFamily: fonts.regular,
                fontSize: 14,
              }}
            />

            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.muted}
                />
              </Pressable>
            )}
          </View>
        </View>

        {subjects.length === 0 && (
          <Text color={colors.muted}>
            No subjects yet. Add your first one below.
          </Text>
        )}

        {subjects.length > 0 &&
          filteredSubjects.length === 0 && (
            <Text color={colors.muted}>
              No subjects match your search.
            </Text>
          )}

        {/* Subject list */}
        <View style={{ gap: spacing.md }}>
          {filteredSubjects.map((s) => (
              <NeoBox
                key={s.id}
                offset={3}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  paddingHorizontal: spacing.md,
                  gap: spacing.sm,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    alignItems: 'flex-start',
                    gap: 4,
                  }}
                >
                  <Pill label={s.name} color={s.color} />
                </View>

                <RoundButton
                  backgroundColor={s.color}
                  accessibilityLabel={`Change ${s.name} color`}
                  onPress={() => setColoring(s)}
                  icon={
                    <Ionicons
                      name="color-palette-outline"
                      size={16}
                      color={getContrastColor(s.color)}
                    />
                  }
                />

                <RoundButton
                  backgroundColor={colors.surface}
                  accessibilityLabel={`Rename ${s.name}`}
                  onPress={() => setRenaming(s)}
                  icon={
                    <Ionicons
                      name="pencil"
                      size={14}
                      color={colors.ink}
                    />
                  }
                />

                <RoundButton
                  backgroundColor={colors.dangerSoft}
                  accessibilityLabel={`Delete ${s.name}`}
                  onPress={() => remove(s)}
                  icon={
                    <Ionicons
                      name="trash-outline"
                      size={15}
                      color={colors.dangerDark}
                    />
                  }
                />
              </NeoBox>
          ))}
        </View>

        <NeoButton
          label="Add Subject"
          backgroundColor={colors.teal}
          icon={
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={colors.ink}
            />
          }
          onPress={() => setAdding(true)}
        />
      </SettingsScaffold>

      {/* Rename modal */}
      <EditNameModal
        visible={renaming !== null}
        title="Rename subject"
        placeholder="Subject name"
        initialName={renaming?.name ?? ''}
        onCancel={() => setRenaming(null)}
        onSave={saveName}
      />

      {/* Color modal */}
      <SubjectColorModal
        visible={coloring !== null}
        subjectName={coloring?.name ?? ''}
        current={coloring?.color ?? ''}
        onClose={() => setColoring(null)}
        onPick={(c) => {
          const s = coloring;
          setColoring(null);
          if (s && c !== s.color) {
            void setSubjectColor(s.id, c);
          }
        }}
      />

      {/* Add subject sheet */}
      <NewSubjectSheet
        visible={adding}
        onClose={() => setAdding(false)}
        onCreated={() => {
          setAdding(false);
          bumpData();
        }}
      />
    </View>
  );
}

/** Automatically chooses a readable foreground color. */
function getContrastColor(backgroundColor: string): string {
  const hex = backgroundColor.replace('#', '');

  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return colors.ink;
  }

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const linearize = (value: number) =>
    value <= 0.04045
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);

  const luminance =
    0.2126 * linearize(r) +
    0.7152 * linearize(g) +
    0.0722 * linearize(b);

  return luminance > 0.179 ? colors.ink : colors.white;
}

/** Small round outlined button with a hard shadow. */
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
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {({ pressed }) => (
        <View
          style={{
            transform: pressed
              ? [{ translateX: 2 }, { translateY: 2 }]
              : [],
          }}
        >
          <NeoBox
            shadow={!pressed}
            offset={2}
            radius={15}
            backgroundColor={backgroundColor}
            style={{
              width: 30,
              height: 30,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: borders.thin,
            }}
          >
            {icon}
          </NeoBox>
        </View>
      )}
    </Pressable>
  );
}
