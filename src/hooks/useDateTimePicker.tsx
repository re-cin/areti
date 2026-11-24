import { NeoButton } from '@/components/ui/NeoButton';
import { colors, spacing } from '@/theme';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet } from 'react-native';

type PickerState = { mode: 'date' | 'time'; value: Date; onPick: (d: Date) => void; minimumDate?: Date } | null;

/**
 * One date/time picker for the whole app.
 * Android opens the native dialog; iOS shows a bottom sheet with a spinner and a Done button.
 * Render `pickerElement` once anywhere in your screen, then call `openPicker(...)`.
 */
export function useDateTimePicker() {
  const [picker, setPicker] = useState<PickerState>(null); // iOS only

  /** `minimumDate` greys out earlier dates/times (iOS spinner and Android date dialog; Android's time dialog can't, so callers still check). */
  const openPicker = (mode: 'date' | 'time', value: Date, onPick: (d: Date) => void, minimumDate?: Date) => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: minimumDate && value < minimumDate ? minimumDate : value,
        mode,
        minimumDate: mode === 'date' ? minimumDate : undefined,
        is24Hour: false,
        onChange: (e, d) => {
          if (e.type === 'set' && d) onPick(d);
        },
      });
    } else {
      setPicker({ mode, value: minimumDate && value < minimumDate ? minimumDate : value, onPick, minimumDate });
    }
  };

  const pickerElement = (
    <Modal transparent animationType="fade" visible={picker !== null} onRequestClose={() => setPicker(null)}>
      <Pressable style={styles.backdrop} onPress={() => setPicker(null)}>
        <Pressable style={styles.card}>
          {picker && (
            <DateTimePicker
              value={picker.value}
              mode={picker.mode}
              minimumDate={picker.minimumDate}
              display="spinner"
              themeVariant="light"
              onChange={(_, d) => d && setPicker({ ...picker, value: d })}
            />
          )}
          <NeoButton
            label="Done"
            backgroundColor={colors.terracotta}
            onPress={() => {
              if (picker) picker.onPick(picker.value);
              setPicker(null);
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );

  return { openPicker, pickerElement };
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xl,
    paddingBottom: 40,
    gap: spacing.md,
  },
});