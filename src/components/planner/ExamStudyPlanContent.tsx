import { Icon } from '@/components/ui/Icon';
import { NeoBox } from '@/components/ui/NeoBox';
import { NeoButton } from '@/components/ui/NeoButton';
import { Segmented } from '@/components/ui/Segmented';
import { Text } from '@/components/ui/Text';
import type { ExamPreferences } from '@/features/planner/examsRepo';
import { studyWindows } from '@/features/planner/engine';
import { addDays, monthLabel, startOfDay, startOfWeek } from '@/lib/dates';
import { formatDuration, formatTime } from '@/lib/format';
import { borders, colors, fonts, radii, spacing } from '@/theme';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

const palette = colors.studyPlan;
const difficultyOptions = [{ key: '1', label: 'Low' }, { key: '3', label: 'Medium' }, { key: '5', label: 'High' }];
export type StudyPlanCard = {
  key: string; title: string; subject: string; color: string;
  startMinute: number; endMinute: number; blocks?: number; locked?: boolean;
};
type SettingKey = 'focusCount' | 'focusMin' | 'breakMin' | 'longBreakMin' | 'dailyGoalMin';
export type ExamStudyPlanContentProps = {
  title: string; subjectName: string; subjectColor: string; difficulty: number;
  urgency: 'default' | 'exam'; examDate: number; today: number; selectedDate: number;
  prefs: ExamPreferences; excluded: number[]; editingDates: boolean; extraOpen: boolean;
  sessions: StudyPlanCard[]; shortfall: number; error: string; status: string;
  saving: boolean; loadingPreview: boolean; protectedCount: number;
  deleting?: boolean;
  actions: {
    back: () => void; settings: () => void; subject: () => void;
    difficulty: (value: number) => void; defaultUrgency: () => void; examDate: () => void;
    scope: (scope: 'this' | 'all') => void; changeCalendar: (direction: number) => void;
    selectDate: (date: number) => void; editDates: () => void; cancelDates: () => void; saveDates: () => void;
    pickStart: () => void; pickEnd: () => void; adjust: (key: SettingKey, direction: number) => void;
    toggleExtra: () => void; toggleWeekday: (day: number) => void;
    protectSubjects: () => void; regenerate: () => void; save: () => void;
    deletePlan: () => void;
  };
};

/** Shared, controlled view: real data in the app and the same layout for visual verification. */
export function ExamStudyPlanContent(p: ExamStudyPlanContentProps) {
  const { prefs, actions } = p;
  const first = startOfWeek(p.selectedDate);
  const dates = Array.from({ length: 14 }, (_, i) => addDays(first, i));
  const daysLeft = Math.max(0, Math.round((p.examDate - p.today) / 86400000));
  const time = (value: number) => {
    const h = Math.floor(value / 60) % 24;
    return `${h % 12 || 12}:${String(value % 60).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
  };
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View pointerEvents="none" style={styles.hero} />
      <View style={styles.header}>
        <Pressable onPress={actions.back} accessibilityLabel="Back to planner" style={styles.headerLink}>
          <Icon name="chevronLeft" size={20} color={palette.text} />
          <Text variant="subheading" style={styles.heading}>Exam Study Plan</Text>
        </Pressable>
        <Pressable onPress={actions.settings} hitSlop={12} accessibilityLabel="Settings"><Icon name="settings" size={19} color={palette.text} /></Pressable>
      </View>

      <View style={styles.examRow}>
        <Text variant="smallStrong" numberOfLines={2} style={styles.examTitle}>{p.title}</Text>
        <Pressable onPress={actions.subject} accessibilityLabel="Edit exam subject" style={[styles.subject, { backgroundColor: p.subjectColor }]}>
          <Text variant="label" color={colors.white} numberOfLines={1} style={styles.subjectText}>{p.subjectName}</Text>
          <Icon name="chevronDown" size={13} color={colors.white} />
        </Pressable>
      </View>
      <View style={styles.configuration}>
        <Text variant="small" style={styles.label}>Difficulty</Text>
        <Segmented options={difficultyOptions} value={String(p.difficulty <= 2 ? 1 : p.difficulty >= 4 ? 5 : 3)} onChange={value => actions.difficulty(Number(value))} />
        <Text variant="small" style={styles.label}>Urgency</Text>
        <View style={styles.urgencyRow}>
          <Pressable style={styles.defaultUrgency} onPress={actions.defaultUrgency} accessibilityRole="button" accessibilityState={{ selected: p.urgency === 'default' }}>
            <NeoBox radius={radii.pill} offset={2} backgroundColor={p.urgency === 'default' ? palette.text : palette.surface} style={styles.urgencyPill}>
              <Text variant="smallStrong" color={p.urgency === 'default' ? palette.surface : palette.text}>Default</Text>
            </NeoBox>
          </Pressable>
          <Pressable style={styles.examUrgency} onPress={actions.examDate} accessibilityRole="button" accessibilityLabel="Change exam date" accessibilityState={{ selected: p.urgency === 'exam' }}>
            <NeoBox radius={radii.pill} offset={2} backgroundColor={p.urgency === 'exam' ? palette.text : palette.surface} style={styles.urgencyPill}>
              <Icon name="calendar" size={14} color={p.urgency === 'exam' ? palette.surface : palette.text} />
              <Text variant="smallStrong" color={p.urgency === 'exam' ? palette.surface : palette.text}>{new Date(p.examDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}</Text>
            </NeoBox>
          </Pressable>
        </View>
        {!!p.status && <Text accessibilityLiveRegion="polite" variant="caption" style={styles.status}>{p.status}</Text>}
      </View>

      <NeoBox radius={18} offset={1} shadowColor={colors.divider} backgroundColor={palette.surface} style={styles.card}>
        <View style={styles.between}>
          <View style={styles.row}><Text variant="smallStrong">Study schedule</Text><Icon name="sync" size={13} color={palette.text} /></View>
          <Pressable onPress={p.editingDates ? actions.cancelDates : actions.editDates} style={styles.row} hitSlop={8} accessibilityLabel={p.editingDates ? 'Cancel date changes' : 'Edit study dates'}>
            <Icon name={p.editingDates ? 'close' : 'pencil'} size={12} color={palette.muted} />
            <Text variant="caption" style={styles.quiet}>{p.editingDates ? 'Cancel Changes' : 'Edit'}</Text>
          </Pressable>
        </View>

        <View style={styles.toggle}>
          {(['this', 'all'] as const).map(scope => <Pressable key={scope} onPress={() => actions.scope(scope)} accessibilityRole="button" accessibilityState={{ selected: prefs.scope === scope }} style={styles.toggleSlot}>
            <View style={[styles.togglePill, prefs.scope === scope && styles.toggleSelected]}><Text variant="smallStrong" color={prefs.scope === scope ? palette.text : palette.muted}>{scope === 'this' ? 'This Exam' : 'All Exams'}</Text></View>
          </Pressable>)}
        </View>
        {prefs.scope === 'this' && <Text variant="caption" style={styles.scopeHint}>Preferences apply to this exam. Choose All Exams to apply them to your other upcoming exams.</Text>}
        <View style={styles.divider} />

        <View style={styles.monthHeader}>
          <Pressable onPress={() => actions.changeCalendar(-1)} hitSlop={12} accessibilityLabel="Previous study dates"><Icon name="chevronLeft" size={17} color={palette.text} /></Pressable>
          <Text variant="smallStrong">{monthLabel(p.selectedDate)}</Text>
          <Pressable onPress={() => actions.changeCalendar(1)} hitSlop={12} accessibilityLabel="Next study dates"><Icon name="chevronRight" size={17} color={palette.text} /></Pressable>
        </View>
        <View style={styles.weekRow}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(label => <Text key={label} variant="caption" style={styles.weekday}>{label}</Text>)}</View>
        {[dates.slice(0, 7), dates.slice(7)].map((week, i) => <View key={i} style={styles.weekRow}>
          {week.map(date => {
              const included = date >= p.today && studyWindows({ ...prefs, excluded: p.excluded, examDate: p.examDate }, date).length > 0;
            const selected = date === startOfDay(p.selectedDate);
            const isExam = date === p.examDate;
            return <Pressable key={date} onPress={() => actions.selectDate(date)} accessibilityRole="button" accessibilityLabel={`${new Date(date).toDateString()}${isExam ? ', exam' : included ? ', study day' : ', no study scheduled'}`} accessibilityState={{ selected }}
              style={[styles.day, included && styles.includedDay, isExam && styles.examDay, selected && styles.selectedDay, p.editingDates && !included && date >= p.today && date < p.examDate && styles.excludedDay]}>
              <Text variant="captionStrong" color={selected || isExam ? palette.surface : included ? palette.text : colors.placeholder}>{new Date(date).getDate()}</Text>
              {isExam && <Text variant="label" color={palette.surface} style={styles.examLabel}>EXAM</Text>}
              {selected && !isExam && <View style={styles.selectedDot} />}
            </Pressable>;
          })}
        </View>)}
        {p.editingDates && <View style={styles.editFooter}>
          <Text variant="caption" style={[styles.scopeHint, styles.grow]}>Tap dates to include or exclude them from the study plan.</Text>
          <Pressable onPress={actions.saveDates} disabled={p.saving} accessibilityRole="button" style={styles.smallButton}><Text variant="captionStrong">Save Changes</Text></Pressable>
        </View>}

        <View style={styles.divider} />
        <View style={styles.summary}>
          <Text variant="captionStrong" style={styles.summaryDate}>{new Date(p.selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          <Text variant="caption" color={colors.terracottaDark} style={styles.countdown}>{daysLeft === 0 ? 'Exam today' : `Exam in\n${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`}</Text>
        </View>

        {!p.editingDates && prefs.scope === 'all' && <View style={styles.sessionList}>
          {p.loadingPreview ? <Text variant="caption" style={styles.empty}>Updating schedule…</Text> : p.sessions.length ? p.sessions.map(session => <NeoBox key={session.key} shadow={false} offset={0} radius={12} backgroundColor={palette.surface} style={styles.session}>
            <View style={styles.sessionTime}><Text variant="captionStrong" style={styles.timeText}>{formatTime(session.startMinute)}</Text><Text variant="caption" style={styles.durationText}>{formatDuration(session.endMinute - session.startMinute)}</Text></View>
            <View style={[styles.sessionDetails, { borderLeftColor: session.color }]}>
              <Text variant="smallStrong" numberOfLines={2} style={styles.sessionTitle}>{session.title}</Text>
              <View style={styles.row}><View style={[styles.sessionSubject, { backgroundColor: session.color }]}><Text variant="label" color={colors.white} style={styles.sessionSubjectText}>{session.subject}</Text></View>
                {session.locked && <Text variant="caption" style={styles.durationText}>Fixed</Text>}
              </View>
            </View>
          </NeoBox>) : <Text variant="caption" style={styles.empty}>{p.selectedDate === p.examDate ? 'Exam day. Your study sessions are scheduled before this date.' : 'No study sessions on this day. Select a purple date to view your plan.'}</Text>}
          {prefs.scope === 'all' && <Pressable onPress={actions.protectSubjects} style={styles.protectedRow} accessibilityRole="button">
            <Text variant="caption" style={[styles.quiet, styles.grow]}>Select subjects that shouldn’t be moved{p.protectedCount ? ` (${p.protectedCount})` : ''}</Text><Icon name="chevronRight" size={15} color={palette.muted} />
          </Pressable>}
        </View>}

        <View style={styles.range}>
          <Text variant="caption" style={styles.quiet}>Study range</Text>
          <View style={styles.row}>
            <Pressable onPress={actions.pickStart} accessibilityLabel="Study start time"><NeoBox radius={12} offset={1} backgroundColor={colors.welcomeTeal} style={styles.timePill}><Text variant="smallStrong">{time(prefs.start)}</Text></NeoBox></Pressable>
            <Text variant="caption" style={styles.quiet}>to</Text>
            <Pressable onPress={actions.pickEnd} accessibilityLabel={`Study end time${prefs.end < prefs.start ? ', next day' : ''}`}><NeoBox radius={12} offset={1} backgroundColor={colors.buttonPeach} style={styles.timePill}><Text variant="smallStrong">{time(prefs.end)}</Text>{prefs.end < prefs.start && <Text variant="caption">Next day</Text>}</NeoBox></Pressable>
          </View>
        </View>
        <Text variant="caption" style={styles.scopeHint}>{prefs.end < prefs.start
          ? 'Ends the next morning. Study days refer to the day you start; after-midnight sessions appear on the next date. Excluded dates and exam day stay free.'
          : 'Your plan adjusts automatically within this range, including time for breaks.'}</Text>
        {!!p.shortfall && <Text variant="caption" accessibilityLiveRegion="polite" style={styles.warning}>{p.shortfall} focus blocks won’t fit before the exam. Adjust your study range or daily goal.</Text>}
        {!!p.error && <Text variant="caption" accessibilityLiveRegion="polite" style={styles.warning}>{p.error}</Text>}
        <View style={styles.divider} />
        {!p.editingDates && prefs.scope === 'all' && <><NeoButton label={p.saving ? 'Updating schedule…' : 'Regenerate Schedule'} backgroundColor={colors.inkSoft} textColor={palette.surface} style={styles.regenerate} contentStyle={styles.buttonFace} icon={<Icon name="sync" size={18} color={palette.surface} />} disabled={p.saving || p.loadingPreview || !!p.error} onPress={actions.regenerate} /><View style={styles.divider} /></>}

        <View style={styles.between}><Text variant="smallStrong">Pomodoro</Text><Text variant="caption" color={colors.terracottaDark}>Target: {prefs.focusCount} blocks</Text></View>
        <SettingRow label="Focus count" value={String(prefs.focusCount)} onMinus={() => actions.adjust('focusCount', -1)} onPlus={() => actions.adjust('focusCount', 1)} />
        <SettingRow label="Focus time" value={`${prefs.focusMin} min`} onMinus={() => actions.adjust('focusMin', -1)} onPlus={() => actions.adjust('focusMin', 1)} />
        <SettingRow label="Break time" value={`${prefs.breakMin} min`} onMinus={() => actions.adjust('breakMin', -1)} onPlus={() => actions.adjust('breakMin', 1)} />
        <SettingRow label="Long break time" value={`${prefs.longBreakMin} min`} onMinus={() => actions.adjust('longBreakMin', -1)} onPlus={() => actions.adjust('longBreakMin', 1)} />
        <Pressable onPress={actions.toggleExtra} style={styles.additional} accessibilityRole="button" accessibilityState={{ expanded: p.extraOpen }}><Text variant="caption" style={styles.quiet}>Additional settings</Text><Icon name={p.extraOpen ? 'chevronUp' : 'chevronDown'} size={15} color={palette.muted} /></Pressable>
        {p.extraOpen && <>
          <SettingRow label="Daily focus goal" value={`${prefs.dailyGoalMin ?? prefs.focusCount * prefs.focusMin} min`} onMinus={() => actions.adjust('dailyGoalMin', -1)} onPlus={() => actions.adjust('dailyGoalMin', 1)} />
          <Text variant="caption" style={styles.quiet}>Study days</Text>
          <View style={styles.weekRow}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => {
            const day = (i + 1) % 7;
            const selected = !prefs.studyDays || prefs.studyDays.includes(day);
            return <Pressable key={i} onPress={() => actions.toggleWeekday(day)} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]} style={[styles.studyDay, selected && styles.toggleSelected]}><Text variant="caption">{label}</Text></Pressable>;
          })}</View>
            <Text variant="caption" style={styles.scopeHint}>The focus goal is shared across exams each calendar day. Harder exams receive a larger share of available study time. Difficulty applies only to the current exam.</Text>
        </>}
      </NeoBox>
      <View style={styles.save}><NeoButton label={p.saving ? 'Saving…' : 'Save study plan'} backgroundColor={palette.button} textColor={palette.surface} icon={<Icon name="download" size={19} color={palette.surface} />} contentStyle={styles.saveButtonFace} disabled={p.saving || p.loadingPreview || p.editingDates || !!p.error} onPress={actions.save} /></View>
      <Pressable onPress={actions.deletePlan} disabled={p.saving || p.deleting} accessibilityRole="button" accessibilityLabel="Delete this study plan" style={styles.deletePlan}>
        <Icon name="trash" size={16} color={colors.dangerDark} /><Text variant="smallStrong" color={colors.dangerDark}>{p.deleting ? 'Deleting study plan…' : 'Delete study plan'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function SettingRow({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return <View style={styles.settingRow}><Text variant="small" style={[styles.quiet, styles.grow]}>{label}</Text>
    <Pressable onPress={onMinus} hitSlop={10} accessibilityLabel={`Decrease ${label}`}><Icon name="chevronLeft" size={16} color={palette.text} /></Pressable>
    <Text variant="smallStrong" style={styles.settingValue}>{value}</Text>
    <Pressable onPress={onPlus} hitSlop={10} accessibilityLabel={`Increase ${label}`}><Icon name="chevronRight" size={16} color={palette.text} /></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  deletePlan: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  root: { flex: 1, backgroundColor: colors.splash }, content: { paddingHorizontal: spacing.xl - spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.xxl, gap: spacing.sm },
  hero: { position: 'absolute', backgroundColor: colors.welcomeTeal, top: -150, height: 660, left: -48, right: -48, borderBottomLeftRadius: 200, borderBottomRightRadius: 200 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: borders.thin, borderColor: palette.text, paddingTop: spacing.sm, paddingBottom: spacing.lg, paddingHorizontal: spacing.xs, marginBottom: spacing.xs },
  headerLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 }, heading: { fontSize: 21, lineHeight: 28, letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 }, between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, grow: { flex: 1 },
  examRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingTop: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: borders.thin, borderColor: palette.border }, examTitle: { flex: 1, fontSize: 17, lineHeight: 24 },
  subject: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '44%', borderWidth: borders.thin, borderColor: palette.border, borderRadius: radii.pill, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs }, subjectText: { flexShrink: 1, fontSize: 10, letterSpacing: 0.3 },
  configuration: { gap: spacing.sm, paddingHorizontal: spacing.xs, paddingBottom: spacing.md }, label: { fontSize: 13, lineHeight: 17 }, urgencyRow: { flexDirection: 'row', gap: spacing.sm }, defaultUrgency: { flex: 1 }, examUrgency: { flex: 1.4 }, urgencyPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm }, status: { fontFamily: fonts.medium, textAlign: 'center', color: palette.muted, marginTop: spacing.xs },
  card: { padding: spacing.lg, gap: spacing.sm, borderColor: palette.border },
  toggle: { flexDirection: 'row', borderWidth: borders.thin, borderColor: palette.border, borderRadius: radii.pill, backgroundColor: palette.toggle, padding: 3 }, toggleSlot: { flex: 1 }, togglePill: { borderWidth: borders.thin, borderColor: 'transparent', borderRadius: radii.pill, alignItems: 'center', paddingVertical: spacing.xs }, toggleSelected: { borderColor: palette.border, backgroundColor: colors.welcomeTeal },
  scopeHint: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, textAlign: 'center', color: palette.muted, paddingHorizontal: spacing.xs }, quiet: { color: palette.muted, fontFamily: fonts.medium }, divider: { backgroundColor: palette.divider, height: 1, marginVertical: spacing.xs },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, paddingVertical: spacing.sm }, weekRow: { flexDirection: 'row', gap: spacing.xs + 1 }, weekday: { flex: 1, fontSize: 10, fontFamily: fonts.medium, textAlign: 'center', color: palette.quiet },
  day: { flex: 1, minWidth: 0, height: 40, borderWidth: 1, borderColor: palette.border, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface }, includedDay: { backgroundColor: palette.calendar }, examDay: { backgroundColor: palette.calendar }, selectedDay: { backgroundColor: palette.text, borderColor: palette.calendar, borderWidth: borders.thick }, excludedDay: { opacity: 0.55 }, examLabel: { fontSize: 7, lineHeight: 9, letterSpacing: 0 }, selectedDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: palette.surface, position: 'absolute', bottom: 5 },
  editFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs }, smallButton: { backgroundColor: colors.welcomeTeal, borderWidth: borders.thin, borderColor: palette.border, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, backgroundColor: colors.splash, borderRadius: spacing.xs, padding: spacing.md, marginBottom: spacing.xs }, summaryDate: { flex: 1, color: palette.muted, fontSize: 12 }, countdown: { fontSize: 11, lineHeight: 14, textAlign: 'right' },
  sessionList: { gap: spacing.sm }, session: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderWidth: 1, borderColor: palette.border }, sessionTime: { width: 46, alignItems: 'center', paddingRight: spacing.sm }, timeText: { fontSize: 11 }, durationText: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 14, color: palette.muted }, sessionDetails: { flex: 1, borderLeftWidth: 3, paddingLeft: spacing.md, gap: spacing.xs }, sessionTitle: { fontSize: 12, lineHeight: 16 }, sessionSubject: { alignSelf: 'flex-start', borderRadius: radii.pill, borderWidth: 0.5, borderColor: palette.border, paddingHorizontal: spacing.xs + 2, paddingVertical: 1 }, sessionSubjectText: { fontSize: 8, lineHeight: 11, letterSpacing: 0.2 }, protectedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderColor: palette.divider, gap: spacing.sm }, empty: { color: palette.muted, fontFamily: fonts.medium, fontSize: 12, paddingVertical: spacing.sm },
  range: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingTop: spacing.sm }, timePill: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.sm }, warning: { color: colors.dangerDark, fontFamily: fonts.medium, fontSize: 11, lineHeight: 15 }, regenerate: { marginVertical: spacing.xs }, buttonFace: { paddingVertical: spacing.sm + 2, borderRadius: 14 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderColor: palette.divider, paddingVertical: spacing.md }, settingValue: { width: 66, textAlign: 'center' }, additional: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm }, studyDay: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border, borderRadius: radii.pill, height: 32 }, save: { marginTop: spacing.md, marginBottom: spacing.sm }, saveButtonFace: { paddingVertical: spacing.md, borderRadius: 15 },
});
