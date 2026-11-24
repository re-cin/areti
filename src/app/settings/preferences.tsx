import { useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { SettingsScaffold } from '@/components/settings/SettingsScaffold';
import { DailyGoalDialog } from '@/components/pet/DailyGoalDialog';
import { loadGoalState, saveTodayGoal, type GoalState } from '@/db/queries/pet';
import { goalHoursText, goalLockText } from '@/features/pet/goal';
import { useDbQuery } from '@/lib/useDbQuery';
import { showNotice } from '@/stores/notice';
import { Text } from '@/components/ui/Text';
import { fonts } from '@/theme';
import {
  usePreferences,
  DAYS,
  type Day,
  type StudySchedule,
} from '@/features/preferences/preferencesStore';

const C = {
  page: '#E8E1D9',
  card: '#F7F2EB',
  cream: '#F1E8D8',
  black: '#1D1B19',
  gray: '#716A62',
  muted: '#AFA79E',
  teal: '#91C9C8',
  orange: '#D99C7B',
  white: '#FFFFFF',
  off: '#BDB8B1',
};

const CUSTOM_SCHEDULE: StudySchedule = {
  Monday: { start: '18:00', end: '20:30' },
  Tuesday: { start: '18:00', end: '20:30' },
  Wednesday: { start: '18:00', end: '20:30' },
  Thursday: { start: '18:00', end: '20:30' },
  Friday: { start: '18:00', end: '20:30' },
  Saturday: { start: '18:00', end: '20:30' },
  Sunday: { start: '18:00', end: '20:30' },
};

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

function formatTime(value: string, format: string) {
  if (format === '24-Hour') return value;

  const [hourText, minute] = value.split(':');
  const hour = Number(hourText);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;

  return `${hour12.toString().padStart(2, '0')}:${minute} ${suffix}`;
}

function Label({
  children,
  color = C.black,
  size = 15,
}: {
  children: ReactNode;
  color?: string;
  size?: number;
}) {
  return (
    <Text
      style={{
        color,
        fontSize: size,
        fontFamily: fonts.semiBold,
      }}
    >
      {children}
    </Text>
  );
}

function Description({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        color: C.gray,
        fontSize: 13,
        lineHeight: 19,
        fontFamily: fonts.medium,
      }}
    >
      {children}
    </Text>
  );
}

function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: object;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: C.card,
          borderWidth: 1.7,
          borderColor: C.black,
          borderRadius: 25,
          padding: 20,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: C.gray,
        fontSize: 16,
        fontFamily: fonts.semiBold,
      }}
    >
      {children}
    </Text>
  );
}

function Divider({ color = '#C9BFB4' }: { color?: string }) {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: color,
        width: '100%',
      }}
    />
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={{
        width: 66,
        height: 39,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: C.black,
        backgroundColor: value ? C.cream : C.off,
        justifyContent: 'center',
        alignItems: value ? 'flex-end' : 'flex-start',
        paddingHorizontal: 4,
      }}
    >
      <View
        style={{
          width: 25,
          height: 25,
          borderRadius: 15,
          backgroundColor: value ? C.orange : C.card,
          borderWidth: 1.5,
          borderColor: C.black,
        }}
      />
    </Pressable>
  );
}

function TimeButton({
  value,
  onSelect,
  color = C.white,
  format,
  disabled = false,
  compact = false,
}: {
  value: string;
  onSelect: (value: string) => void;
  color?: string;
  format: string;
  disabled?: boolean;
  /** Smaller box (Custom tab): the time can wrap onto two lines instead of overflowing. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={{
          flex: 1,
          minHeight: compact ? 42 : 49,
          backgroundColor: disabled ? '#E4DED6' : color,
          borderWidth: 1.8,
          borderColor: disabled ? C.muted : C.black,
          borderRadius: compact ? 14 : 18,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: compact ? 3 : 6,
          paddingVertical: compact ? 4 : 0,
          opacity: disabled ? 0.5 : 1,
          shadowColor: C.black,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: disabled ? 0 : 1,
          shadowRadius: 0,
          elevation: disabled ? 0 : 2,
        }}
      >
        <Text
          style={{
            color: disabled ? C.gray : C.black,
            fontSize: compact ? 13 : 16,
            lineHeight: compact ? 16 : undefined,
            fontFamily: fonts.semiBold,
            textAlign: 'center',
          }}
        >
          {formatTime(value, format)}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'center',
            padding: 28,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: C.card,
              borderRadius: 24,
              borderWidth: 2,
              borderColor: C.black,
              padding: 18,
              maxHeight: '70%',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <Label size={18}>Select Time</Label>
              <Pressable onPress={() => setOpen(false)}>
                <Ionicons name="close" size={24} color={C.black} />
              </Pressable>
            </View>

            <ScrollView>
              {TIME_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    onSelect(option);
                    setOpen(false);
                  }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    backgroundColor:
                      option === value ? C.teal : 'transparent',
                  }}
                >
                  <Label size={15}>{formatTime(option, format)}</Label>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function DropdownRow({
  label,
  value,
  options,
  onSelect,
  last = false,
  optionLabel = (option: string) => option,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  last?: boolean;
  /** Text shown for an option (defaults to the option itself). */
  optionLabel?: (option: string) => string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View
      style={{
        borderBottomWidth: last ? 0 : 1.5,
        borderBottomColor: C.black,
      }}
    >
      <Pressable
        onPress={() => setOpen(!open)}
        style={{
          minHeight: 65,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Label color={C.gray} size={16}>{label}</Label>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Label size={15}>{optionLabel(value)}</Label>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={17}
            color={C.black}
          />
        </View>
      </Pressable>

      {open &&
        options.map((option) => (
          <Pressable
            key={option}
            onPress={() => {
              onSelect(option);
              setOpen(false);
            }}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 18,
              backgroundColor: option === value ? C.teal : '#EEE8E0',
            }}
          >
            <Label size={14}>{optionLabel(option)}</Label>
          </Pressable>
        ))}
    </View>
  );
}

function ChoiceButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 41,
        paddingHorizontal: 8,
        borderRadius: 24,
        borderWidth: 1.7,
        borderColor: C.black,
        backgroundColor: selected ? C.black : C.card,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: C.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 2,
      }}
    >
      <Label color={selected ? C.card : C.black} size={15}>
        {label}
      </Label>
    </Pressable>
  );
}

function ScheduleRow({
  day,
  start,
  end,
  enabled,
  onToggle,
  onStart,
  onEnd,
  format,
}: {
  day: Day;
  start: string;
  end: string;
  enabled: boolean;
  onToggle: () => void;
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
  format: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
      }}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
        style={{
          flex: 1,
          minHeight: 42,
          borderRadius: 21,
          borderWidth: 1.7,
          borderColor: C.black,
          backgroundColor: enabled ? C.black : C.card,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 4,
        }}
      >
        <Label color={enabled ? C.card : C.black} size={13}>
          {day}
        </Label>
      </Pressable>

      <View style={{ flex: 0.85 }}>
        <TimeButton
          value={start}
          onSelect={onStart}
          format={format}
          disabled={!enabled}
          compact
        />
      </View>

      <Text style={{ color: C.gray, fontWeight: '500', fontSize: 13 }}>
        to
      </Text>

      <View style={{ flex: 0.85 }}>
        <TimeButton
          value={end}
          onSelect={onEnd}
          format={format}
          disabled={!enabled}
          compact
        />
      </View>
    </View>
  );
}

const loadGoalStateNow = () => loadGoalState();

export default function PreferencesScreen() {
  const preferences = usePreferences(s => s.preferences);
  const updatePreferences = usePreferences(s => s.updatePreferences);

  const {
    backgroundWork,
    notifications,
    sleepStart,
    sleepEnd,
    chatter,
    dailyGoal,
    dateFormat,
    firstDay,
    timeFormat,
    mode,
    schedule,
    enabledDays,
    defaultSlots,
  } = preferences;

  const format = timeFormat === '24-Hour' ? '24-Hour' : '12-Hour (AM/PM)';

  const updateSchedule = (day: Day, field: 'start' | 'end', value: string) => {
    updatePreferences({
      schedule: {
        ...preferences.schedule,
        [day]: { ...preferences.schedule[day], [field]: value },
      },
    });
  };

  // Default tab: its own Weekdays / Weekends slots, so editing it never changes the Custom tab's days.
  const updateDefaultSlot = (group: 'weekdays' | 'weekends', field: 'start' | 'end', value: string) => {
    updatePreferences({
      defaultSlots: { ...defaultSlots, [group]: { ...defaultSlots[group], [field]: value } },
    });
  };

  const toggleDay = (day: Day) => {
    updatePreferences({
      enabledDays: enabledDays.includes(day)
        ? enabledDays.filter(item => item !== day)
        : [...enabledDays, day],
    });
  };

  const resetCustomSchedule = () => {
    updatePreferences({ schedule: CUSTOM_SCHEDULE, enabledDays: [...DAYS] });
  };

  // Today's study goal (shared with Reti and the daily question).
  const goalState = useDbQuery(loadGoalStateNow, null as GoalState | null);
  const goalMinutes = goalState?.goalMinutes ?? Math.round(dailyGoal * 60);
  const [goalOpen, setGoalOpen] = useState(false);

  return (
    <SettingsScaffold title="Preferences">
      <View
        style={{
          paddingHorizontal: 10,
          paddingBottom: 35,
          gap: 25,
        }}
      >
        {/* PERMISSIONS */}
        <Card>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 12,
            }}
          >
            <Label>Permissions</Label>
            <View
              style={{
                backgroundColor: C.black,
                borderRadius: 22,
                paddingHorizontal: 20,
                paddingVertical: 6,
              }}
            >
              <Label color={C.white} size={13}>Granted</Label>
            </View>
          </View>

          <Divider color={C.muted} />

          <View style={{ paddingTop: 17, gap: 19 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Label>Work in Background</Label>
                <Description>Let areti running in the background</Description>
              </View>
              <Toggle value={backgroundWork} onChange={(value) => updatePreferences({ backgroundWork: value })} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Label>Notification</Label>
                <Description>
                  Push alerts for study reminders and daily streak warnings
                </Description>
              </View>
              <Toggle value={notifications} onChange={(value) => updatePreferences({ notifications: value })} />
            </View>
          </View>
        </Card>

        {/* SLEEP SCHEDULE */}
        <View style={{ gap: 6 }}>
          <SectionHeading>Sleep Schedule</SectionHeading>
          <Card>
            <View style={{ gap: 9 }}>
              <Label size={18}>Grace Period</Label>
              <Description>
                Set your preferred sleeping times so the system won&apos;t reduce
                your momentum during this grace period.
              </Description>
            </View>

            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                marginTop: 20,
                marginBottom: 18,
              }}
            >
              <TimeButton
                value={sleepStart}
                onSelect={(value) => updatePreferences({ sleepStart: value })}
                color={C.teal}
                format={format}
              />
              <TimeButton
                value={sleepEnd}
                onSelect={(value) => updatePreferences({ sleepEnd: value })}
                color={C.orange}
                format={format}
              />
            </View>

            <Text
              style={{
                textAlign: 'center',
                color: C.gray,
                fontSize: 13,
                fontWeight: '500',
              }}
            >
              The system has a maximum grace period of 10 hours.
            </Text>
          </Card>
        </View>

        {/* PET BEHAVIOR */}
        <View style={{ gap: 6 }}>
          <SectionHeading>Pet Behavior</SectionHeading>
          <Card>
            <View style={{ gap: 12 }}>
              <Label>Pet Chatter</Label>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['Reserved', 'Balanced', 'Chatty'].map((item) => (
                  <ChoiceButton
                    key={item}
                    label={item}
                    selected={chatter === item}
                    onPress={() => updatePreferences({ chatter: item })}
                  />
                ))}
              </View>
            </View>

            <View style={{ marginVertical: 18 }}>
              <Divider />
            </View>

            {/* Daily goal: asked each morning; changeable here until study starts (at most twice a day). */}
            <Pressable
              onPress={() => (goalState && !goalState.lock ? setGoalOpen(true) : undefined)}
              disabled={!goalState || Boolean(goalState.lock)}
              accessibilityRole="button"
              accessibilityLabel={`Daily goal ${goalHoursText(goalMinutes)}${goalLockText(goalState?.lock ?? null) ? '. ' + goalLockText(goalState?.lock ?? null) : '. Change'}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Label>Daily Goal</Label>
                <Description>
                  {goalLockText(goalState?.lock ?? null) ??
                    'How many hours to study today. Reti reacts to it. You can change it until you start studying (twice a day at most).'}
                </Description>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {goalState?.lock && <Ionicons name="lock-closed" size={16} color={C.gray} />}
                <View style={{ minWidth: 70, alignItems: 'flex-end' }}>
                  <Label size={19} color={goalState?.lock ? C.gray : C.black}>{goalHoursText(goalMinutes)}</Label>
                </View>
                {!goalState?.lock && <Ionicons name="chevron-forward" size={21} color={C.black} />}
              </View>
            </Pressable>
          </Card>
        </View>

        {/* DATE AND TIME FORMAT */}
        <View style={{ gap: 6 }}>
          <SectionHeading>Date & Time Format</SectionHeading>
          <View
            style={{
              backgroundColor: C.card,
              borderWidth: 1.7,
              borderColor: C.black,
              borderRadius: 22,
              overflow: 'hidden',
            }}
          >
            <DropdownRow
              label="Date Format"
              value={dateFormat}
              options={['Month d', 'dd/mm/yy', 'mm/dd/yy', 'yyyy-mm-dd']}
              optionLabel={(option) => (option === 'Month d' ? 'Month Day (November 29)' : option)}
              onSelect={(value) => updatePreferences({ dateFormat: value })}
            />
            <DropdownRow
              label="First Day of Week"
              value={firstDay}
              options={['Monday', 'Sunday']}
              onSelect={(value) => updatePreferences({ firstDay: value as 'Monday' | 'Sunday' })}
            />
            <DropdownRow
              label="Time Format"
              value={timeFormat}
              options={['12-Hour (AM/PM)', '24-Hour']}
              onSelect={(value) => updatePreferences({ timeFormat: value as '12-Hour (AM/PM)' | '24-Hour' })}
              last
            />
          </View>
        </View>

        {/* PLANNER STUDY SLOTS */}
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <SectionHeading>Planner Study Slots</SectionHeading>

            <View
              style={{
                flexDirection: 'row',
                borderWidth: 1.7,
                borderColor: C.black,
                borderRadius: 28,
                padding: 4,
                backgroundColor: C.card,
              }}
            >
              {(['Default', 'Custom'] as const).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => updatePreferences({ mode: item })}
                  style={{
                    borderRadius: 22,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    backgroundColor: mode === item ? C.teal : 'transparent',
                  }}
                >
                  <Label size={14} color={mode === item ? C.black : C.gray}>
                    {item}
                  </Label>
                </Pressable>
              ))}
            </View>
          </View>

          <Card style={{ padding: 18 }}>
            {mode === 'Default' ? (
              <>
                <View style={{ gap: 18 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Label size={17}>WEEKDAYS:</Label>
                    <Label size={16} color={C.gray}>Mon – Fri</Label>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <View style={{ flex: 0.65 }}>
                      <Label color={C.gray} size={15}>Time</Label>
                    </View>
                    <View style={{ flex: 1 }}>
                      <TimeButton
                        value={defaultSlots.weekdays.start}
                        onSelect={(value) => updateDefaultSlot('weekdays', 'start', value)}
                        format={format}
                      />
                    </View>
                    <Text style={{ color: C.gray, fontWeight: '500' }}>to</Text>
                    <View style={{ flex: 1 }}>
                      <TimeButton
                        value={defaultSlots.weekdays.end}
                        onSelect={(value) => updateDefaultSlot('weekdays', 'end', value)}
                        format={format}
                      />
                    </View>
                  </View>
                </View>

                <View style={{ marginVertical: 22 }}>
                  <Divider />
                </View>

                <View style={{ gap: 18 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Label size={17}>WEEKENDS:</Label>
                    <Label size={16} color={C.gray}>Sat – Sun</Label>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <View style={{ flex: 0.65 }}>
                      <Label color={C.gray} size={15}>Time</Label>
                    </View>
                    <View style={{ flex: 1 }}>
                      <TimeButton
                        value={defaultSlots.weekends.start}
                        onSelect={(value) => updateDefaultSlot('weekends', 'start', value)}
                        format={format}
                      />
                    </View>
                    <Text style={{ color: C.gray, fontWeight: '500' }}>to</Text>
                    <View style={{ flex: 1 }}>
                      <TimeButton
                        value={defaultSlots.weekends.end}
                        onSelect={(value) => updateDefaultSlot('weekends', 'end', value)}
                        format={format}
                      />
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <View style={{ gap: 13 }}>
                {DAYS.map((day) => (
                  <ScheduleRow
                    key={day}
                    day={day}
                    start={schedule[day].start}
                    end={schedule[day].end}
                    enabled={enabledDays.includes(day)}
                    onToggle={() => toggleDay(day)}
                    onStart={(value) => updateSchedule(day, 'start', value)}
                    onEnd={(value) => updateSchedule(day, 'end', value)}
                    format={format}
                  />
                ))}
              </View>
            )}

            <View
              style={{
                marginTop: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: '#8B7D70',
                    fontSize: 12,
                    lineHeight: 17,
                    fontWeight: '500',
                  }}
                >
                  The modifications will only apply to future study plans
                </Text>
              </View>

              {mode === 'Custom' && (
                <Pressable
                  onPress={resetCustomSchedule}
                  style={{
                    backgroundColor: C.orange,
                    borderWidth: 1.7,
                    borderColor: C.black,
                    borderRadius: 16,
                    paddingHorizontal: 23,
                    paddingVertical: 8,
                    shadowColor: C.black,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                    elevation: 2,
                  }}
                >
                  <Label size={15}>Reset</Label>
                </Pressable>
              )}
            </View>
          </Card>
        </View>
      </View>
      <DailyGoalDialog
        visible={goalOpen}
        initialMinutes={goalMinutes}
        title="Change today's goal"
        message="You can't change it again today after this, or once you start studying."
        onCancel={() => setGoalOpen(false)}
        onSave={async (minutes) => {
          try {
            await saveTodayGoal(minutes);
            updatePreferences({ dailyGoal: minutes / 60 });
            setGoalOpen(false);
          } catch (e) {
            setGoalOpen(false);
            setTimeout(() => showNotice({ title: "Couldn't change the goal", message: e instanceof Error ? e.message : String(e) }), 400);
          }
        }}
      />
    </SettingsScaffold>
  );
}
