import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { PetGhost } from '@/components/pet/PetGhost';
import { DialogButton } from '@/components/ui/ConfirmDialog';
import { NeoBox } from '@/components/ui/NeoBox';
import { Text } from '@/components/ui/Text';
import { useQuickFade } from '@/components/ui/useQuickFade';
import { clampGoal, GOAL_MAX, GOAL_MIN, GOAL_STEP, goalHoursText } from '@/features/pet';
import { usePetView } from '@/hooks/usePetView';
import { colors, fonts, spacing } from '@/theme';

type Props = {
  visible: boolean;
  /** Minutes shown when the dialog opens. */
  initialMinutes: number;
  title: string;
  message: string;
  /** Daily question: no Cancel (the goal has to be set). */
  required?: boolean;
  onSave: (minutes: number) => void | Promise<void>;
  onCancel?: () => void;
};

/** "What's your study goal today?" with Reti and a 1–7 hour picker. */
export function DailyGoalDialog({ visible, initialMinutes, title, message, required, onSave, onCancel }: Props) {
  const { mounted, backdropStyle, cardStyle } = useQuickFade(visible);
  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={required ? () => {} : onCancel} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl }}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(17,17,17,0.45)' }, backdropStyle]} />
        <Animated.View style={cardStyle}>
          {/* Mounted only while shown, so the pet's live data isn't read in the background. */}
          {visible && (
            <GoalCard initialMinutes={initialMinutes} title={title} message={message} required={required} onSave={onSave} onCancel={onCancel} />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function GoalCard({ initialMinutes, title, message, required, onSave, onCancel }: Omit<Props, 'visible'>) {
  const pet = usePetView();
  const [minutes, setMinutes] = useState(() => clampGoal(initialMinutes));
  const [saving, setSaving] = useState(false);
  const step = (dir: number) => setMinutes((m) => clampGoal(m + dir * GOAL_STEP));
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(minutes);
    } finally {
      setSaving(false);
    }
  };
  return (
    <View accessibilityViewIsModal>
      <View style={{ alignItems: 'center', marginBottom: -28, zIndex: 1 }} pointerEvents="none">
        <PetGhost expression={pet.expression.id} overlay={pet.overlay} customUrl={pet.custom?.url} width={96} />
      </View>
      <NeoBox backgroundColor={colors.white} style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: 36, gap: spacing.sm, alignItems: 'center' }}>
        <Text variant="heading" style={{ fontSize: 22, lineHeight: 28, textAlign: 'center' }} accessibilityRole="header">
          {title}
        </Text>
        <Text color={colors.muted} style={{ textAlign: 'center' }}>
          {message}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md }}>
          <Pressable onPress={() => step(-1)} disabled={minutes <= GOAL_MIN} hitSlop={12} accessibilityRole="button" accessibilityLabel="Less">
            <Ionicons name="chevron-back" size={26} color={minutes <= GOAL_MIN ? colors.mutedSoft : colors.ink} />
          </Pressable>
          <View style={{ width: 110, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 30, lineHeight: 38 }} accessibilityLiveRegion="polite">
              {goalHoursText(minutes)}
            </Text>
          </View>
          <Pressable onPress={() => step(1)} disabled={minutes >= GOAL_MAX} hitSlop={12} accessibilityRole="button" accessibilityLabel="More">
            <Ionicons name="chevron-forward" size={26} color={minutes >= GOAL_MAX ? colors.mutedSoft : colors.ink} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, alignSelf: 'stretch' }}>
          {!required && <DialogButton label="Cancel" backgroundColor={colors.white} onPress={() => onCancel?.()} />}
          <DialogButton label={saving ? 'Saving…' : 'Set goal'} backgroundColor={colors.teal} onPress={() => void save()} />
        </View>
      </NeoBox>
    </View>
  );
}
