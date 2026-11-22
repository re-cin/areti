import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui/Text';
import { colors, radii } from '@/theme';
import { Pressable, StyleSheet, View } from 'react-native';
import { dotColor, plannerColors as extra } from './plannerColors';

/** Next upcoming exam, with a View button. */
export function ExamBanner() {
  // TODO: nearest upcoming exam from the database; "No upcoming exams" when there is none.
  return (
    <View style={styles.banner}>
      <View style={styles.bannerLeft}>
        <View style={[styles.bannerDot, { backgroundColor: dotColor }]} />
        <Text variant="captionStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
          Physics exam and 3 more in <Text variant="captionStrong" color={extra.orange}>9 days</Text>
        </Text>
      </View>
      <Pressable style={styles.viewBtn}>
        <Text variant="captionStrong">View</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  bannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 },
  bannerDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: colors.ink },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});
