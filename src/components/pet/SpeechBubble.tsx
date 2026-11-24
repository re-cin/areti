import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, fonts } from '@/theme';

type Props = {
  text: string;
  /** Horizontal offset of the tail from the bubble's center (Figma: +75). */
  tailOffset?: number;
  onPress?: () => void;
};

/** Rounded bubble with a tail pointing down at the ghost. */
export function SpeechBubble({ text, tailOffset = 75, onPress }: Props) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Ghost says: ${text}`} accessibilityHint="Tap for another line">
      <View style={styles.bubble}>
        <Text style={styles.text}>{text}</Text>
      </View>
      {/* Tail: a square with two borders, rotated, tucked under the bubble edge. */}
      <View style={[styles.tailWrap, { transform: [{ translateX: tailOffset }] }]}>
        <View style={styles.tail} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: colors.pet.sheet,
    borderColor: colors.pet.outline,
    borderWidth: 1.5,
    borderRadius: 19,
    minHeight: 47,
    paddingHorizontal: 13.5,
    paddingVertical: 13,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 1, height: 2 },
    elevation: 2,
  },
  text: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 19 },
  tailWrap: { alignSelf: 'center', height: 12, marginTop: -8.5, zIndex: 2 },
  tail: {
    width: 16,
    height: 16,
    backgroundColor: colors.pet.sheet,
    borderColor: colors.pet.outline,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    transform: [{ rotate: '45deg' }],
  },
});
