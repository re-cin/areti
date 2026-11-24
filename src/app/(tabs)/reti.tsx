import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomizeSection } from '@/components/pet/CustomizeSection';
import { ExpressionsGrid } from '@/components/pet/ExpressionsGrid';
import { GridBackdrop } from '@/components/pet/GridBackdrop';
import { MoodCard } from '@/components/pet/MoodCard';
import { PetGhost } from '@/components/pet/PetGhost';
import { SpeechBubble } from '@/components/pet/SpeechBubble';
import { XpCard } from '@/components/pet/XpCard';
import { HeaderGear, ScreenHeader } from '@/components/ui/ScreenHeader';
import { pickLine } from '@/features/pet';
import { refreshPetContent } from '@/features/pet/customContent';
import { renamePet, usePetEvents, usePetView } from '@/hooks/usePetView';
import { PET_NAME_MAX, usePetStore } from '@/stores/petStore';
import { colors, spacing } from '@/theme';

/** The hero moves at this share of the scroll speed, so the sheet slides up over the ghost. */
const HERO_RATE = 0.66;
/** Space between the ghost and the top of the sheet (Figma: 65). */
const SHEET_GAP = 65;
/** Keep at least this much of the sheet visible on short screens. */
const SHEET_PEEK = 170;

export default function RetiScreen() {
  const insets = useSafeAreaInsets();
  // A new random pick among added expressions each time the tab is opened, and fresh content from the admin site.
  const [rollSeed, setRollSeed] = useState(() => Date.now());
  useFocusEffect(useCallback(() => {
    setRollSeed(Date.now());
    void refreshPetContent().catch(() => {});
  }, []));
  const pet = usePetView(rollSeed);
  usePetEvents(pet);
  const talk = usePetStore((s) => s.talk);
  const scrollRef = useRef<Animated.ScrollView>(null);

  const [screenH, setScreenH] = useState(0);
  const [heroH, setHeroH] = useState(0);
  const sheetTop = screenH && heroH ? Math.min(heroH + SHEET_GAP, screenH - SHEET_PEEK) : heroH + SHEET_GAP;

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  // The hero lives inside the scroll content (so it stays tappable); pushing it down
  // by part of the scroll makes it move slower than the sheet.
  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.max(0, scrollY.value) * (1 - HERO_RATE) }],
  }));

  const line = pickLine(pet.lines, pet.talkIndex);
  const nextUnlockText = pet.next
    ? `${pet.next.expressions.map((e) => e.label).join(', ')} · Level ${pet.next.level}`
    : null;

  return (
    <View style={styles.root} onLayout={(e: LayoutChangeEvent) => setScreenH(e.nativeEvent.layout.height)}>
      <GridBackdrop />
      <Animated.ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.hero, heroStyle]} onLayout={(e) => setHeroH(e.nativeEvent.layout.height)}>
          <View style={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg + 4 }}>
            <ScreenHeader
              title={pet.name}
              leading="avatar"
              onAvatarPress={() => router.push('/settings/account')}
              trailing={<HeaderGear onPress={() => router.push('/settings')} />}
            />
          </View>

          <XpCard
            level={pet.level.level}
            totalExp={pet.level.totalExp}
            nextLevelExp={pet.level.nextLevelExp}
            progress={pet.level.progress}
            expToday={pet.expToday}
            nextUnlockText={nextUnlockText}
          />

          <View style={styles.bubble}>
            <SpeechBubble text={line} onPress={talk} />
          </View>

          <View style={styles.ghost}>
            <PetGhost expression={pet.expression.id} overlay={pet.overlay} customUrl={pet.custom?.url} onPress={talk} />
          </View>
        </Animated.View>

        <View style={[styles.sheet, { marginTop: sheetTop - heroH, minHeight: Math.max(0, screenH - SHEET_PEEK + 120) }]}>
          <MoodCard
            expression={pet.expression}
            momentum={pet.momentum}
            minutesToday={pet.minutesToday}
            goalMinutes={pet.goalMinutes}
          />
          {/* Display only: expressions are tried out on the admin site (Pet › Test Reti). */}
          <ExpressionsGrid level={pet.level.level} unlockedCount={pet.unlockedCount} totalCount={pet.totalCount} />
          <CustomizeSection
            name={pet.name}
            maxLength={PET_NAME_MAX}
            onRename={renamePet}
            onOpenSettings={() => router.push('/settings')}
          />
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.pet.page },
  hero: { zIndex: 0 },
  bubble: { marginTop: 62, marginLeft: 34, marginRight: 36 },
  ghost: { alignItems: 'center', marginTop: 14 },
  sheet: {
    zIndex: 1,
    backgroundColor: colors.pet.sheet,
    borderRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 21,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 2, height: -5 },
    elevation: 6,
  },
});
