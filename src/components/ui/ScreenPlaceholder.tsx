import { colors, spacing } from '@/theme';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NeoBox } from './NeoBox';
import { Text } from './Text';

/** Temporary body for screens nobody has built yet. Delete when the real screen lands. */
export function ScreenPlaceholder({ title, note }: { title: string; note: string }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <View style={{ padding: spacing.lg, gap: spacing.lg }}>
        <Text variant="title">{title}</Text>
        <NeoBox style={{ padding: spacing.lg }}>
          <Text variant="body">{note}</Text>
        </NeoBox>
      </View>
    </SafeAreaView>
  );
}
