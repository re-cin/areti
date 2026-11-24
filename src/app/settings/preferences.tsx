import { SettingsScaffold } from '@/components/settings/SettingsScaffold';
import { NeoBox } from '@/components/ui/NeoBox';
import { Text } from '@/components/ui/Text';
import { colors, fonts, spacing } from '@/theme';
import { View } from 'react-native';

/** Visual preview of the upcoming Preferences screen. Controls are intentionally static. */
export default function PreferencesScreen() {
  return <SettingsScaffold title="Preferences">
    <NeoBox style={{ padding: spacing.lg, gap: spacing.md }}>
      <Text variant="smallStrong">Permissions</Text>
      <Row label="Work in Background" detail="Let areti run in the background" value="On" />
      <Row label="Notification" detail="Push alerts for study reminders and daily streak warnings" value="On" />
    </NeoBox>
    <Text variant="caption" color={colors.muted}>Sleep Schedule</Text>
    <NeoBox style={{ padding: spacing.lg, gap: spacing.md }}>
      <Text variant="smallStrong">Grace Period</Text>
      <Text variant="caption" color={colors.muted}>Set your preferred sleeping times so the system won’t reduce your momentum during this grace period.</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}><Chip label="7:30 am" /><Text>to</Text><Chip label="9:30 pm" /></View>
      <Text variant="caption" color={colors.muted}>The system has a maximum grace period of 10 hours.</Text>
    </NeoBox>
    <Text variant="caption" color={colors.muted}>Pet Behavior</Text>
    <NeoBox style={{ padding: spacing.lg, gap: spacing.md }}>
      <Text variant="smallStrong">Pet Chatter</Text>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}><Chip label="Reserved" /><Chip label="Balanced" selected /><Chip label="Chatty" /></View>
      <Row label="Pet Physics" detail="Turn off pet physics when guiding your fingers on your pet." value="On" />
      <Row label="Daily Goal" detail="Set how many hours to study for in a day" value="3 hrs" />
    </NeoBox>
    <Text variant="caption" color={colors.muted}>Date &amp; Time Format</Text>
    <NeoBox style={{ padding: spacing.lg, gap: spacing.md }}>
      <Row label="Date Format" value="dd/mm/yy" />
      <Row label="First Day of Week" value="Monday" />
      <Row label="Time Format" value="12-Hour (AM/PM)" />
    </NeoBox>
    <Text variant="caption" color={colors.muted}>Planner Study Slots</Text>
    <NeoBox style={{ padding: spacing.lg, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}><Chip label="Default" selected /><Chip label="Custom" /></View>
      <Text variant="smallStrong">WEEKDAYS</Text>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <Chip key={index} label={day} selected={index < 5} />)}
      </View>
      <Row label="Time" value="06:00 AM  to  08:00 PM" />
      <Text variant="smallStrong">WEEKENDS</Text>
      <Row label="Time" value="06:00 AM  to  08:00 PM" />
      <Text variant="caption" color={colors.muted}>Study slot preferences will be editable here in a future update.</Text>
    </NeoBox>
  </SettingsScaffold>;
}

function Row({ label, detail, value }: { label: string; detail?: string; value: string }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: spacing.sm }}>
    <View style={{ flex: 1 }}><Text variant="smallStrong">{label}</Text>{detail && <Text variant="caption" color={colors.muted}>{detail}</Text>}</View>
    <Text variant="captionStrong">{value}</Text>
  </View>;
}

function Chip({ label, selected = false }: { label: string; selected?: boolean }) {
  return <View style={{ borderWidth: 1, borderColor: colors.ink, borderRadius: 18, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: selected ? colors.ink : colors.surface }}>
    <Text variant="caption" color={selected ? colors.white : colors.ink} style={{ fontFamily: fonts.semiBold }}>{label}</Text>
  </View>;
}
