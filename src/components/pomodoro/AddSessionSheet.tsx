import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { Pill } from '@/components/ui/Pill';
import { Stepper } from '@/components/ui/Stepper';
import { Text } from '@/components/ui/Text';
import { formatClock } from '@/lib/dateHelpers';
import type { SubjectRow } from '@/features/subjects/subjectsRepo';
import { addPlannedSession } from '@/features/timer/timerRepo';
import { colors, spacing } from '@/theme';
import { usePreferences } from '@/features/preferences/preferencesStore';


type Props = { visible: boolean; onClose: () => void; subjects: SubjectRow[] };

/** Next quarter hour from now, in minutes from midnight. */
function nextQuarter(): number {
  const d = new Date();
  const m = d.getHours() * 60 + d.getMinutes();
  return Math.min(23 * 60 + 45, Math.ceil((m + 1) / 15) * 15);
}

/** Bottom sheet to plan a session for today by hand. */
export function AddSessionSheet({ visible, onClose, subjects }: Props) {
  return <AddSessionForm key={String(visible)} visible={visible} onClose={onClose} subjects={subjects} />;
}

function AddSessionForm({ visible, onClose, subjects }: Props) {
    const timeFormat = usePreferences(s => s.preferences.timeFormat);
    const [selectedSubjectId, setSubjectId] = useState<string | null>(null);
    const subjectId = subjects.some(subject => subject.id === selectedSubjectId) ? selectedSubjectId : subjects[0]?.id ?? null;
    const [startMinute, setStartMinute] = useState(nextQuarter);
    const [blocks, setBlocks] = useState(2);

  const save = async () => {
    if (!subjectId) return;
    await addPlannedSession({ subjectId, startMinute, blocks });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={onClose} accessibilityLabel="Close" />
      <View style={{ position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.xl }}>
        <NeoBox style={{ padding: spacing.lg, gap: spacing.lg }}>
          <Text variant="heading">New session today</Text>

          {subjects.length === 0 ? (
            <View style={{ gap: spacing.md }}>
              <Text color={colors.muted}>Add a subject first, then you can plan sessions for it.</Text>
              <NeoButton
                label="Add a subject"
                onPress={() => {
                  onClose();
                  router.push('/settings/subjects');
                }}
              />
            </View>
          ) : (
            <>
              <View style={{ gap: spacing.sm }}>
                <Text variant="bodyStrong">Subject</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {subjects.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => setSubjectId(s.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: subjectId === s.id }}
                      style={{ opacity: subjectId === s.id ? 1 : 0.4 }}>
                      <Pill label={s.name} color={s.color} />
                    </Pressable>
                  ))}
                </View>
              </View>

              <Row label="Start time">
                <Stepper
                  value={startMinute}
                  onChange={setStartMinute}
                  min={0}
                  max={23 * 60 + 45}
                  step={15}
                  format={(value) => formatClock(value, timeFormat)}
                  accessibilityLabel="start time"
                />
              </Row>
              <Row label="Focus blocks">
                <Stepper value={blocks} onChange={setBlocks} min={1} max={8} accessibilityLabel="focus blocks" />
              </Row>

              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <NeoButton label="Cancel" backgroundColor={colors.surface} onPress={onClose} />
                </View>
                <View style={{ flex: 1 }}>
                  <NeoButton label="Add" backgroundColor={colors.terracotta} onPress={save} disabled={!subjectId} />
                </View>
              </View>
            </>
          )}
        </NeoBox>
      </View>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text variant="bodyStrong">{label}</Text>
      {children}
    </View>
  );
}
