import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, spacing } from '@/theme';

/** Page frame shared by the settings sub-pages: teal arc on top, back header, scrolling body. */
export function SettingsScaffold({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      {/* Sticky header (with the teal arc) stays at the top while the page scrolls */}
      <View style={{ backgroundColor: colors.page, paddingTop: insets.top + spacing.xl, paddingHorizontal: spacing.lg, paddingBottom: spacing.xs, zIndex: 2 }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -60,
          left: -width * 0.1,
          width: width * 1.2,
          height: 100,
          backgroundColor: colors.teal,
          borderBottomLeftRadius: 60,
          borderBottomRightRadius: 60,
        }}
      />
        <ScreenHeader title={title} back />
      </View>
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, paddingBottom: insets.bottom + spacing.lg, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled">
        {children}
        {footer && <View style={{ flex: 1, justifyContent: 'flex-end' }}>{footer}</View>}
      </ScrollView>
    </View>
  );
}
