import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { fonts } from '@/theme';

// The same "Select Time" popup as Settings › Preferences (Planner Study Slots): a list of times every
// 30 minutes. Times before `minMinute` are greyed out and can't be picked.

const C = {
  card: '#F7F2EB',
  black: '#1D1B19',
  gray: '#716A62',
  muted: '#AFA79E',
  teal: '#91C9C8',
} as const;

const ROW_HEIGHT = 46;

/** Every 30 minutes from 0:00 to 23:30, plus `extra` (e.g. 23:59 for an end time). */
export function halfHourTimes(extra: number[] = []): number[] {
  const list = Array.from({ length: 48 }, (_, i) => i * 30);
  return [...new Set([...list, ...extra])].sort((a, b) => a - b);
}

/** minutes since midnight -> "7:30 PM" */
export function formatMinutes(min: number): string {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

type Props = {
  visible: boolean;
  /** Selected time, minutes since midnight. */
  value: number;
  onSelect: (minutes: number) => void;
  onClose: () => void;
  title?: string;
  /** Options before this are disabled (e.g. times that have passed today). */
  minMinute?: number;
  /** The times offered (minutes since midnight). Default: every 30 minutes. */
  options?: number[];
};

export function TimeListModal({ visible, value, onSelect, onClose, title = 'Select Time', minMinute = 0, options }: Props) {
  const list = options ?? halfHourTimes();
  // Open scrolled to the selected time (or the first time that can be picked).
  const anchor = Math.max(0, list.findIndex((m) => m >= Math.max(value, minMinute)) - 2);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 28 }}
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ color: C.black, fontSize: 18, fontFamily: fonts.semiBold }}>{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={C.black} />
            </Pressable>
          </View>

          <ScrollView contentOffset={{ x: 0, y: anchor * ROW_HEIGHT }}>
            {list.map((option) => {
              const disabled = option < minMinute;
              const selected = option === value;
              return (
                <Pressable
                  key={option}
                  disabled={disabled}
                  onPress={() => {
                    onSelect(option);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled }}
                  style={{
                    height: ROW_HEIGHT,
                    justifyContent: 'center',
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    backgroundColor: selected ? C.teal : 'transparent',
                  }}
                >
                  <Text style={{ color: disabled ? C.muted : C.black, fontSize: 15, fontFamily: fonts.semiBold }}>
                    {formatMinutes(option)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
