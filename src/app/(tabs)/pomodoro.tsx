import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Alert, Animated, PanResponder, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UpcomingSessions } from '@/components/pomodoro/UpcomingSessions';
import { BlockDots } from '@/components/ui/BlockDots';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconButton } from '@/components/ui/IconButton';
import { Pill } from '@/components/ui/Pill';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { formatTimer } from '@/lib/dateHelpers';
import { useDbQuery } from '@/lib/useDbQuery';
import { getGhost } from '@/features/pet/petRepo';
import { getNotificationPermission, requestNotificationPermission } from '@/features/timer/notifications';
import { DEFAULT_POMODORO, loadPomodoroSettings } from '@/features/timer/pomodoroSettings';
import { listUpcomingToday, type UpcomingSession } from '@/features/timer/timerRepo';
import { selectRemainingMs, useTimer, type StartOptions } from '@/features/timer/timerStore';
import { borders, colors, fonts, radii, spacing } from '@/theme';

const PHASE_LABEL = { focus: 'FOCUS', break: 'BREAK', longBreak: 'LONG BREAK' } as const;

/** Height of the compact timer (dots + big time) shown above the expanded sheet. */
const COMPACT_HEIGHT = 150;
const SHEET_RADIUS = 28;

export default function PomodoroScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const [confirmingStop, setConfirmingStop] = useState(false);

  // ---- Bottom sheet: follows the finger, snaps open (compact timer on top) or closed (full timer). ----
  const [screenH, setScreenH] = useState(0);
  const [fullH, setFullH] = useState(0); // height of the full timer area (header .. controls)
  const expandedTop = insets.top + COMPACT_HEIGHT;
  // Closed: the sheet starts right under the controls, but always peeks at least 140px on small phones.
  const collapsedTop = Math.max(expandedTop, screenH > 0 ? Math.min(fullH, screenH - 140) : fullH);
  const measured = screenH > 0 && fullH > 0;

  const sheetY = useRef(new Animated.Value(10_000)).current; // sheet's top edge, in px from the screen top
  const pos = useRef({ expandedTop, collapsedTop, expanded: false, dragStart: 0 });
  pos.current.expandedTop = expandedTop;
  pos.current.collapsedTop = collapsedTop;
  pos.current.expanded = expanded;
  const listRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const listY = useRef(0);

  const snap = (open: boolean, velocity = 0) => {
    pos.current.expanded = open;
    setExpanded(open);
    if (!open) listRef.current?.scrollTo({ y: 0, animated: false });
    Animated.spring(sheetY, {
      toValue: open ? pos.current.expandedTop : pos.current.collapsedTop,
      velocity,
      useNativeDriver: true,
      bounciness: 4,
      speed: 14,
    }).start();
  };
  const snapRef = useRef(snap);
  snapRef.current = snap;

  // Keep the sheet in place when sizes change (first layout, timer controls appearing, rotation).
  const dragging = useRef(false);
  useEffect(() => {
    if (measured && !dragging.current) sheetY.setValue(pos.current.expanded ? expandedTop : collapsedTop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measured, expandedTop, collapsedTop]);

  const drag = useMemo(
    () =>
      PanResponder.create({
        // Claim vertical drags: any drag while closed; while open, only a downward drag with the list at its top.
        onMoveShouldSetPanResponderCapture: (_e, g) => {
          if (Math.abs(g.dy) < 6 || Math.abs(g.dy) < Math.abs(g.dx)) return false;
          return pos.current.expanded ? g.dy > 0 && listY.current <= 0 : true;
        },
        onPanResponderGrant: () => {
          dragging.current = true;
          sheetY.stopAnimation((v) => {
            pos.current.dragStart = v;
          });
        },
        onPanResponderMove: (_e, g) => {
          const { expandedTop: lo, collapsedTop: hi, dragStart } = pos.current;
          let y = dragStart + g.dy;
          // Soft resistance past the ends
          if (y < lo) y = lo - (lo - y) * 0.2;
          if (y > hi) y = hi + (y - hi) * 0.2;
          sheetY.setValue(y);
        },
        onPanResponderRelease: (_e, g) => {
          const { expandedTop: lo, collapsedTop: hi, dragStart } = pos.current;
          const y = dragStart + g.dy;
          const open = g.vy < -0.4 ? true : g.vy > 0.4 ? false : y < (lo + hi) / 2;
          dragging.current = false;
          snapRef.current(open, g.vy);
        },
        onPanResponderTerminate: () => {
          dragging.current = false;
          snapRef.current(pos.current.expanded);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [sheetY],
  );

  // 0 = closed, 1 = open. Drives the cross-fade between the full and compact timer.
  // Memoised: the screen re-renders twice a second while the timer runs, and rebuilding these
  // animated nodes on every render re-attaches them natively, which makes the screen flicker.
  const { fullOpacity, compactOpacity } = useMemo(() => {
    const progress = sheetY.interpolate({
      inputRange: [expandedTop, Math.max(expandedTop + 1, collapsedTop)],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    return {
      fullOpacity: progress.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' }),
      compactOpacity: progress.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
    };
  }, [sheetY, expandedTop, collapsedTop]);
  const sheetTransform = useMemo(() => [{ translateY: sheetY }], [sheetY]);

  // ---- Data ----
  const timer = useTimer();
  const remaining = useTimer(selectRemainingMs);
  const settings = useDbQuery(loadPomodoroSettings, [], DEFAULT_POMODORO);
  const ghost = useDbQuery(getGhost, [], { id: '', level: 1, xp: 0, xpToNext: 200 });
  const upcoming = useDbQuery(() => listUpcomingToday(), [], [] as UpcomingSession[]);

  const idle = timer.status === 'idle';
  // Idle shows a full focus block (e.g. 25:00) so the countdown starts from there, not from 00:00.
  const displayMs = idle ? settings.focusMin * 60_000 : remaining;
  const run = timer.run;
  const totalDots = run ? run.totalBlocks : settings.focusCount;
  const filledDots = run ? run.completedBlocks + (run.phase === 'focus' ? 1 : 0) : 0;

  const start = async (opts?: StartOptions) => {
    if ((await getNotificationPermission()) === 'undetermined') await requestNotificationPermission();
    await timer.start(opts);
  };

  const startSession = (s: UpcomingSession) => {
    if (!idle) {
      if (s.id !== timer.plannedSessionId) Alert.alert('A session is running', 'Stop the current session before starting another one.');
      return;
    }
    void start({
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      subjectColor: s.subjectColor,
      plannedSessionId: s.id,
      blocks: s.blocks - s.completedBlocks,
      settings: s.settings, // the settings this session was scheduled with
    });
    snap(false);
  };

  // What "End session" will save: the minutes focused in the current block (under 1 min is not saved).
  const focusedMin =
    run?.phase === 'focus' && timer.cfg ? Math.floor((timer.cfg.focusMin * 60_000 - remaining) / 60_000) : 0;
  const stopHighlight =
    run?.phase !== 'focus'
      ? `${run?.completedBlocks ?? 0} of ${run?.totalBlocks ?? 0} blocks done`
      : focusedMin >= 1
        ? `${focusedMin} min will be saved`
        : 'Less than a minute, nothing saved';

  const circle = Math.min(width - 96, 290);

  return (
    <View style={{ flex: 1, backgroundColor: colors.page, overflow: 'hidden' }} onLayout={(e) => {
        const h = Math.round(e.nativeEvent.layout.height);
        setScreenH((prev) => (Math.abs(prev - h) > 1 ? h : prev));
      }}>
      {/* Teal backdrop with a rounded bottom edge */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: -width * 0.25,
          width: width * 1.5,
          height: Math.max(insets.top + 620, collapsedTop + 40),
          backgroundColor: colors.teal,
          borderBottomLeftRadius: width * 0.75,
          borderBottomRightRadius: width * 0.75,
        }}
      />

      {/* Full timer: header, level, dial, controls (fades out as the sheet opens) */}
      <Animated.View
        pointerEvents={expanded ? 'none' : 'auto'}
        onLayout={(e) => {
          const h = Math.round(e.nativeEvent.layout.height);
          setFullH((prev) => (Math.abs(prev - h) > 1 ? h : prev));
        }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: fullOpacity, paddingTop: insets.top, paddingHorizontal: spacing.lg }}>
        <View style={{ paddingBottom: spacing.xs }}>
          <ScreenHeader title="Pomodoro" gearHref="/settings/account" />
        </View>

        <View style={{ alignItems: 'center', marginTop: spacing.md, gap: 6 }}>
          <Text style={{ fontFamily: fonts.semiBold, fontSize: 14 }}>LVL {ghost.level}</Text>
          <BlockDots total={totalDots} filled={filledDots} />
          <Text variant="caption" style={{ fontFamily: fonts.semiBold, fontSize: 11 }}>
            {ghost.xp} / {ghost.xpToNext} XP
          </Text>
        </View>

        {/* Timer dial */}
        <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
          <View style={{ width: circle + 6, height: circle + 6 }}>
            <View
              style={{
                position: 'absolute',
                top: 6,
                left: 6,
                width: circle,
                height: circle,
                borderRadius: circle / 2,
                backgroundColor: colors.ink,
              }}
            />
            <View
              style={{
                width: circle,
                height: circle,
                borderRadius: circle / 2,
                backgroundColor: colors.terracotta,
                borderWidth: borders.width + 0.5,
                borderColor: colors.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 14,
                  left: 14,
                  right: 14,
                  bottom: 14,
                  borderRadius: circle,
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: colors.muted,
                }}
              />
              {timer.subjectName && !idle && (
                <View style={{ marginBottom: 4 }}>
                  <Pill label={timer.subjectName} color={timer.subjectColor ?? colors.pill.other} />
                </View>
              )}
              <Text accessibilityRole="timer" style={{ fontFamily: fonts.semiBold, fontSize: circle * 0.26, lineHeight: circle * 0.3 }}>
                {formatTimer(displayMs)}
              </Text>
              {run && (
                <View style={{ backgroundColor: colors.ink, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 3 }}>
                  <Text variant="label" color={colors.white} style={{ fontSize: 12 }}>
                    {timer.status === 'paused' ? 'PAUSED' : PHASE_LABEL[run.phase]}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Controls */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: spacing.md,
            marginTop: spacing.xl,
            marginBottom: spacing.xl,
          }}>
          {idle ? (
            <>
              <IconButton icon="play" size={64} radius={16} backgroundColor={colors.teal} accessibilityLabel="Start focus" onPress={() => void start()} />
              <IconButton icon="settings" size={48} accessibilityLabel="Timer settings" onPress={() => router.push('/settings/timer')} />
            </>
          ) : (
            <>
              <IconButton icon="restart" size={52} accessibilityLabel="Restart this phase" onPress={timer.restartPhase} />
              {timer.status === 'running' ? (
                <IconButton icon="pause" size={64} radius={16} backgroundColor={colors.terracotta} accessibilityLabel="Pause" onPress={timer.pause} />
              ) : (
                <IconButton icon="play" size={64} radius={16} backgroundColor={colors.teal} accessibilityLabel="Resume" onPress={timer.resume} />
              )}
              <IconButton icon="settings" size={52} accessibilityLabel="Timer settings" onPress={() => router.push('/settings/timer')} />
              <IconButton icon="close" size={52} accessibilityLabel="End session" onPress={() => setConfirmingStop(true)} />
            </>
          )}
        </View>
      </Animated.View>

      {/* Compact timer shown above the open sheet (fades in) */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: insets.top,
          left: 0,
          right: 0,
          height: COMPACT_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          opacity: compactOpacity,
        }}>
        <BlockDots total={totalDots} filled={filledDots} size={24} />
        <Text style={{ fontFamily: fonts.semiBold, fontSize: 72, lineHeight: 84 }}>{formatTimer(displayMs)}</Text>
      </Animated.View>

      {/* Upcoming sessions sheet: drag it, flick it, or tap its title */}
      <Animated.View
        {...drag.panHandlers}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: Math.max(0, screenH - expandedTop),
          opacity: measured ? 1 : 0,
          transform: sheetTransform,
          backgroundColor: colors.surface,
          borderTopLeftRadius: SHEET_RADIUS,
          borderTopRightRadius: SHEET_RADIUS,
        }}>
        {/* Grab handle */}
        <View style={{ alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.md }}>
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: colors.mutedSoft }} />
        </View>
        <ScrollView
          ref={listRef}
          scrollEnabled={expanded}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            listY.current = e.nativeEvent.contentOffset.y;
          }}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}>
          <UpcomingSessions
            sessions={upcoming}
            focusMin={timer.cfg?.focusMin ?? settings.focusMin}
            activeSessionId={timer.plannedSessionId}
            expanded={expanded}
            onToggleExpanded={() => snap(!expanded)}
            onAdd={() => {
              // TODO: + (add a session) is disabled for now. The sheet lives in components/pomodoro/AddSessionSheet.tsx.
            }}
            onStart={startSession}
          />
        </ScrollView>
      </Animated.View>

      <ConfirmDialog
        visible={confirmingStop && !idle}
        title="End this session?"
        message="Your focus time so far goes to your statistics, and Reti keeps the XP."
        highlight={stopHighlight}
        cancelLabel="Keep going"
        confirmLabel="End session"
        confirmColor={colors.terracotta}
        onCancel={() => setConfirmingStop(false)}
        onConfirm={() => {
          setConfirmingStop(false);
          void timer.stop();
        }}
      />
    </View>
  );
}
