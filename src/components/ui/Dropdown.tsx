import { borders, colors } from '@/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text } from './Text';

export type DropdownOption = { key: string; label: string; color?: string };

type Props = {
  value: string | null;
  options: DropdownOption[];
  onChange: (key: string) => void;
  placeholder?: string;
  uppercase?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Space kept free at the bottom of the screen (for a pinned button bar). If the list would run into it, it opens upward. */
  bottomReserve?: number;
};

const MAX_ROWS = 5; // more options than this and the list scrolls

/**
 * The option list is an absolutely positioned child of the field's own wrapper, with top: 0, so its top edge
 * is exactly the field's top edge. It covers the field and takes no space in the layout, so nothing moves.
 * Every row is as tall as the field. No Modal and no screen coordinates are involved in the position.
 * Near the bottom of the screen it opens upward instead (its bottom edge on the field's bottom edge).
 */
export function Dropdown({
  value,
  options,
  onChange,
  placeholder = 'Select',
  uppercase,
  style,
  bottomReserve = 160,
}: Props) {
  const fieldRef = useRef<ComponentRef<typeof View>>(null);
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [rowH, setRowH] = useState(46);
  const { height: windowH } = useWindowDimensions();

  const selected = options.find((o) => o.key === value);
  const fmt = (s: string) => (uppercase ? s.toUpperCase() : s);
  const listH = Math.min(options.length, MAX_ROWS) * rowH;

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const node = fieldRef.current;
    if (!node) return;
    // Measure only to learn the field height and whether there is room below. It does not position the list.
    node.measureInWindow((_x, y, _w, h) => {
      setRowH(h);
      setOpenUp(y + Math.min(options.length, MAX_ROWS) * h > windowH - bottomReserve);
      setOpen(true);
    });
  };

  // Android back button closes the list first
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [open]);

  return (
    <View ref={fieldRef} collapsable={false} style={[style, open && styles.raised]}>
      <Pressable onPress={toggle} accessibilityRole="button" style={styles.field}>
        {selected?.color ? <View style={[styles.dot, { backgroundColor: selected.color }]} /> : null}
        <Text
          variant={selected ? 'smallStrong' : 'bodyStrong'}
          color={selected ? colors.ink : colors.placeholder}
          style={{ flex: 1 }}
          numberOfLines={1}>
          {selected ? fmt(selected.label) : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.ink} />
      </Pressable>

      {open && (
        <>
          {/* Invisible layer: tapping anywhere else on the form closes the list */}
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close list" />
          <View style={[styles.list, openUp ? { bottom: 0 } : { top: 0 }, { height: listH }]}>
            <ScrollView nestedScrollEnabled bounces={false} showsVerticalScrollIndicator={false}>
              {options.map((o, i) => (
                <Pressable
                  key={o.key}
                  onPress={() => {
                    onChange(o.key);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    { height: rowH },
                    i > 0 && styles.rowDivider,
                    (pressed || o.key === value) && { backgroundColor: colors.page },
                  ]}>
                  {o.color ? <View style={[styles.dot, { backgroundColor: o.color }]} /> : null}
                  <Text variant="smallStrong" style={{ flex: 1 }} numberOfLines={1}>
                    {fmt(o.label)}
                  </Text>
                  {o.key === value && <Ionicons name="checkmark" size={18} color={colors.ink} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Lifts the open dropdown above the fields that come after it
  raised: { zIndex: 100, elevation: 10 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderColor: colors.ink,
    borderWidth: borders.thin,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  backdrop: { position: 'absolute', top: -1500, bottom: -1500, left: -1500, right: -1500 },
  list: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderColor: colors.ink,
    borderWidth: borders.thin,
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
  },
  rowDivider: { borderTopWidth: borders.thin, borderTopColor: colors.ink },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: borders.width, borderColor: colors.ink },
});