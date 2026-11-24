import { useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { SettingsScaffold } from '@/components/settings/SettingsScaffold';
import { Text } from '@/components/ui/Text';
import { fonts } from '@/theme';

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

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

type Day = (typeof DAYS)[number];
type Schedule = Record<Day, { start: string; end: string }>;

const DEFAULT_SCHEDULE: Schedule = {
  Monday: { start: '06:00', end: '20:00' },
  Tuesday: { start: '06:00', end: '20:00' },
  Wednesday: { start: '06:00', end: '20:00' },
  Thursday: { start: '06:00', end: '20:00' },
  Friday: { start: '06:00', end: '20:00' },
  Saturday: { start: '06:00', end: '20:00' },
  Sunday: { start: '06:00', end: '20:00' },
};

const CUSTOM_SCHEDULE: Schedule = {
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
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  last?: boolean;
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
          <Label size={15}>{value}</Label>
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
            <Label size={14}>{option}</Label>
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

export default function PreferencesScreen() {
  const [backgroundWork, setBackgroundWork] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const [sleepStart, setSleepStart] = useState('07:30');
  const [sleepEnd, setSleepEnd] = useState('21:30');

  const [chatter, setChatter] = useState('Balanced');
  const [dailyGoal, setDailyGoal] = useState(3);

  const [dateFormat, setDateFormat] = useState('dd/mm/yy');
  const [firstDay, setFirstDay] = useState('Monday');
  const [timeFormat, setTimeFormat] = useState('12-Hour (AM/PM)');

  const [mode, setMode] = useState<'Default' | 'Custom'>('Default');
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE);

  const [enabledDays, setEnabledDays] = useState<Day[]>([...DAYS]);

  const format = timeFormat === '24-Hour' ? '24-Hour' : '12-Hour (AM/PM)';

  const updateSchedule = (
    day: Day,
    field: 'start' | 'end',
    value: string,
  ) => {
    setSchedule((current) => ({
      ...current,
      [day]: {
        ...current[day],
        [field]: value,
      },
    }));
  };

  const updateGroupSchedule = (
    days: Day[],
    field: 'start' | 'end',
    value: string,
  ) => {
    setSchedule((current) => {
      const updated = { ...current };
      days.forEach((day) => {
        updated[day] = { ...updated[day], [field]: value };
      });
      return updated;
    });
  };

  const toggleDay = (day: Day) => {
    setEnabledDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day],
    );
  };

  const resetCustomSchedule = () => {
    setSchedule(CUSTOM_SCHEDULE);
    setEnabledDays([...DAYS]);
  };

  const changeDailyGoal = (direction: number) => {
    setDailyGoal((current) =>
      Math.max(1, Math.min(7, Math.round((current + direction) * 2) / 2)),
    );
  };

  return (
    <SettingsScaffold title="Preferences">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
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
              <Toggle value={backgroundWork} onChange={setBackgroundWork} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Label>Notification</Label>
                <Description>
                  Push alerts for study reminders and daily streak warnings
                </Description>
              </View>
              <Toggle value={notifications} onChange={setNotifications} />
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
                Set your preferred sleeping times so the system won't reduce
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
                onSelect={setSleepStart}
                color={C.teal}
                format={format}
              />
              <TimeButton
                value={sleepEnd}
                onSelect={setSleepEnd}
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
                    onPress={() => setChatter(item)}
                  />
                ))}
              </View>
            </View>

            <View style={{ marginVertical: 18 }}>
              <Divider color="#E7DED4" />
              <View style={{ height: 16 }} />
              <Divider />
            </View>


            <View
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
                  Set how many hours to study for in a day affecting Reti's reactions
                </Description>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 13,
                }}
              >
                <Pressable
                  onPress={() => changeDailyGoal(-0.5)}
                  disabled={dailyGoal <= 1}
                >
                  <Ionicons
                    name="chevron-back"
                    size={21}
                    color={dailyGoal <= 1 ? C.muted : C.black}
                  />
                </Pressable>

                {/* Fixed width: the arrows and the text beside them don't move when the goal is 2.5 hrs. */}
                <View style={{ width: 84, alignItems: 'center' }}>
                  <Label size={19}>
                    {Number.isInteger(dailyGoal) ? dailyGoal : dailyGoal.toFixed(1)} hrs
                  </Label>
                </View>

                <Pressable
                  onPress={() => changeDailyGoal(0.5)}
                  disabled={dailyGoal >= 7}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={21}
                    color={dailyGoal >= 7 ? C.muted : C.black}
                  />
                </Pressable>
              </View>
            </View>
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
              options={['dd/mm/yy', 'mm/dd/yy', 'yyyy-mm-dd']}
              onSelect={setDateFormat}
            />
            <DropdownRow
              label="First Day of Week"
              value={firstDay}
              options={['Monday', 'Sunday']}
              onSelect={setFirstDay}
            />
            <DropdownRow
              label="Time Format"
              value={timeFormat}
              options={['12-Hour (AM/PM)', '24-Hour']}
              onSelect={setTimeFormat}
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
                  onPress={() => setMode(item)}
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
                        value={schedule.Monday.start}
                        onSelect={(value) =>
                          updateGroupSchedule(
                            DAYS.slice(0, 5),
                            'start',
                            value,
                          )
                        }
                        format={format}
                      />
                    </View>
                    <Text style={{ color: C.gray, fontWeight: '500' }}>to</Text>
                    <View style={{ flex: 1 }}>
                      <TimeButton
                        value={schedule.Monday.end}
                        onSelect={(value) =>
                          updateGroupSchedule(
                            DAYS.slice(0, 5),
                            'end',
                            value,
                          )
                        }
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
                        value={schedule.Saturday.start}
                        onSelect={(value) =>
                          updateGroupSchedule(
                            DAYS.slice(5),
                            'start',
                            value,
                          )
                        }
                        format={format}
                      />
                    </View>
                    <Text style={{ color: C.gray, fontWeight: '500' }}>to</Text>
                    <View style={{ flex: 1 }}>
                      <TimeButton
                        value={schedule.Saturday.end}
                        onSelect={(value) =>
                          updateGroupSchedule(
                            DAYS.slice(5),
                            'end',
                            value,
                          )
                        }
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
      </ScrollView>
    </SettingsScaffold>
  );
}
