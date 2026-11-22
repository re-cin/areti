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
import { borders, colors, radii, spacing } from '@/theme';
import { Icon } from './Icon';
import { NeoBox } from './NeoBox';
import { Text } from './Text';

// Two dropdowns share this file:
//  - SimpleDropdown: string options + accessibilityLabel (Pomodoro settings sounds)
//  - OptionDropdown: Ryan's { key, label, color } options with placeholder (Planner > Add Task)
// <Dropdown> picks one by its props.

export function Dropdown(props: SimpleProps | OptionProps) {
  if ('accessibilityLabel' in props) return <SimpleDropdown {...props} />;
  return <OptionDropdown {...props} />;
}

type SimpleProps = {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  accessibilityLabel: string;
};

/** Outlined select box that opens an inline list underneath. */
function SimpleDropdown({ value, options, onChange, accessibilityLabel }: SimpleProps) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}: ${value}`}
        accessibilityState={{ expanded: open }}>
        <NeoBox radius={radii.tile} offset={3} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md - 2 }}>
          <Text variant="bodyStrong" style={{ flex: 1 }}>
            {value}
          </Text>
          <Icon name={open ? 'chevronUp' : 'chevronDown'} size={20} strokeWidth={2.5} />
        </NeoBox>
      </Pressable>
      {open && (
        <View
          style={{
            borderWidth: borders.thin,
            borderColor: colors.ink,
            borderRadius: radii.tile,
            backgroundColor: colors.white,
            overflow: 'hidden',
          }}>
          {options.map((opt, i) => {
            const selected = opt === value;
            return (
              <Pressable
                key={opt}
                onPress={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => ({
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.md,
                  backgroundColor: selected ? colors.tealSoft : pressed ? colors.page : colors.white,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.line,
                })}>
                <Text variant={selected ? 'bodyStrong' : 'body'}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------- Ryan's dropdown

export type DropdownOption = { key: string; label: string; color?: string };

type OptionProps = {
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
function OptionDropdown({
  value,
  options,
  onChange,
  placeholder = 'Select',
  uppercase,
  style,
  bottomReserve = 160,
}: OptionProps) {
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
    <View ref={fieldRef} collapsable={false} style={[style, open && optionStyles.raised]}>
      <Pressable onPress={toggle} accessibilityRole="button" style={optionStyles.field}>
        {selected?.color ? <View style={[optionStyles.dot, { backgroundColor: selected.color }]} /> : null}
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
          <Pressable style={optionStyles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close list" />
          <View style={[optionStyles.list, openUp ? { bottom: 0 } : { top: 0 }, { height: listH }]}>
            <ScrollView nestedScrollEnabled bounces={false} showsVerticalScrollIndicator={false}>
              {options.map((o, i) => (
                <Pressable
                  key={o.key}
                  onPress={() => {
                    onChange(o.key);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    optionStyles.row,
                    { height: rowH },
                    i > 0 && optionStyles.rowDivider,
                    (pressed || o.key === value) && { backgroundColor: colors.page },
                  ]}>
                  {o.color ? <View style={[optionStyles.dot, { backgroundColor: o.color }]} /> : null}
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

const optionStyles = StyleSheet.create({
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
