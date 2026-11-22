import { View } from 'react-native';
import { IconButton } from '@/components/ui/IconButton';
import { colors, spacing } from '@/theme';

type Props = {
  running: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  onStop?: () => void;
  onSettings?: () => void;
};

/** Idle: play + settings. Running: reset, pause, settings, stop. */
export function TimerControls({ running, onStart, onPause, onReset, onStop, onSettings }: Props) {
  if (!running) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
        <IconButton icon="play" size={68} iconSize={28} backgroundColor={colors.teal} onPress={onStart} accessibilityLabel="Start" />
        <IconButton icon="settings" size={52} onPress={onSettings} accessibilityLabel="Timer settings" />
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
      <IconButton icon="reset" size={52} onPress={onReset} accessibilityLabel="Restart block" />
      <IconButton icon="pause" size={68} iconSize={26} backgroundColor={colors.terracotta} onPress={onPause} accessibilityLabel="Pause" />
      <IconButton icon="settings" size={52} onPress={onSettings} accessibilityLabel="Timer settings" />
      <IconButton icon="close" size={52} onPress={onStop} accessibilityLabel="Stop session" />
    </View>
  );
}
