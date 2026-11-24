import { Dropdown } from '@/components/ui/Dropdown';
import { Slider } from '@/components/ui/Slider';
import { Text } from '@/components/ui/Text';
import { backgroundSource, notificationSource } from '@/features/audio/sounds';
import { useSoundPreview } from '@/features/audio/useSoundPreview';
import {
  BACKGROUND_SOUNDS, DEFAULT_POMODORO, loadPomodoroSettings,
  NOTIFICATION_SOUNDS, savePomodoroSettings, type PomodoroSettings,
} from '@/features/timer/pomodoroSettings';
import { colors, fonts, spacing } from '@/theme';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

/** The study plan uses the same sound preferences as the Pomodoro settings screen. */
export function AudioAmbienceSettings() {
  const [form, setForm] = useState<PomodoroSettings>(DEFAULT_POMODORO);
  const [loaded, setLoaded] = useState(false);
  const preview = useSoundPreview();

  useEffect(() => {
    let live = true;
    loadPomodoroSettings().then(value => {
      if (live) { setForm(value); setLoaded(true); }
    }).catch(error => console.warn('[study plan] Could not load sound settings', error));
    return () => { live = false; preview.stop(); };
    // The preview hook returns a new wrapper on render; cleanup is only needed on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      void savePomodoroSettings(form).catch(error => console.warn('[study plan] Could not save sound settings', error));
    }, 300);
    return () => clearTimeout(timer);
  }, [form, loaded]);

  const set = <K extends keyof PomodoroSettings>(key: K, value: PomodoroSettings[K]) =>
    setForm(current => ({ ...current, [key]: value }));

  return <View style={{ gap: spacing.sm, paddingVertical: spacing.sm }}>
    <Text variant="smallStrong">Audio &amp; Ambience</Text>
    <Text variant="small" color={colors.muted}>Background Sound</Text>
    <Dropdown value={form.backgroundSound} options={BACKGROUND_SOUNDS} accessibilityLabel="Background sound"
      onChange={value => { set('backgroundSound', value); preview.play(backgroundSource(value), form.backgroundVolume, { background: value }); }} />
    <VolumeLabel label="Background Volume" value={form.backgroundVolume} />
    <Slider value={form.backgroundVolume} accessibilityLabel="Background volume"
      onChange={value => { set('backgroundVolume', value); preview.setVolume(value); }}
      onDragStart={() => preview.play(backgroundSource(form.backgroundSound), form.backgroundVolume, { background: form.backgroundSound })} />
    <Text variant="small" color={colors.muted}>Notification Sound</Text>
    <Dropdown value={form.notificationSound} options={NOTIFICATION_SOUNDS} accessibilityLabel="Notification sound"
      onChange={value => { set('notificationSound', value); preview.play(notificationSource(value), form.notificationVolume); }} />
    <VolumeLabel label="Notification Volume" value={form.notificationVolume} />
    <Slider value={form.notificationVolume} accessibilityLabel="Notification volume"
      onChange={value => { set('notificationVolume', value); preview.setVolume(value); }}
      onDragEnd={() => preview.play(notificationSource(form.notificationSound), form.notificationVolume)} />
  </View>;
}

function VolumeLabel({ label, value }: { label: string; value: number }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
    <Text variant="small" color={colors.muted}>{label}</Text>
    <Text variant="caption" style={{ fontFamily: fonts.semiBold }}>{value}%</Text>
  </View>;
}
