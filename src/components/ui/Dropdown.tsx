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
  /** Shown as the only row when there are no options (e.g. "No subjects yet"). */
  emptyLabel?: string;
  /** Open the list in the page flow, below the field, pushing what comes after down (scrolls with the
   *  page). Use near the bottom of a form so the list never covers buttons pinned under it. */
  inline?: boolean;
  /** Inline only: rows shown before the list scrolls (default: all). */
  visibleRows?: number;
  /** Background of the chosen row (default: page cream). */
  selectedColor?: string;
  /** With emptyLabel: a link in the empty row (e.g. "+ Add subject") that closes the list and calls this. */
  onAddNew?: () => void;
  addNewLabel?: string;
};

const MAX_ROWS = 5; // more options than this and the list scrolls

/**
 * The field stays visible and the option list opens attached underneath it, as one outlined box
 * (Figma "Planner - Add Task"). The list is absolutely positioned just below the field's own wrapper,
 * so it floats over the fields after it and nothing moves. Every row is as tall as the field.
 * Near the bottom of the screen it opens upward instead (attached to the field's top edge).
 */
function OptionDropdown({
  value,
  options,
  onChange,
  placeholder = 'Select',
  uppercase,
  style,
  bottomReserve = 160,
  emptyLabel = 'Nothing to choose yet',
  onAddNew,
  addNewLabel = '+ Add',
  inline = false,
  visibleRows,
  selectedColor = colors.page,
}: OptionProps) {
  const fieldRef = useRef<ComponentRef<typeof View>>(null);
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [rowH, setRowH] = useState(46);
  const { height: windowH } = useWindowDimensions();

  const selected = options.find((o) => o.key === value);
  const fmt = (s: string) => (uppercase ? s.toUpperCase() : s);
  const rowCount = Math.max(options.length, 1); // the empty state takes one row
  const listH = Math.min(rowCount, MAX_ROWS) * rowH;

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const node = fieldRef.current;
    if (!node) return;
    if (inline) {
      setOpenUp(false);
      setOpen(true);
      return;
    }
    // Measure only to learn the field height and whether there is room below. It does not position the list.
    node.measureInWindow((_x, y, _w, h) => {
      setRowH(h);
      setOpenUp(y + h + Math.min(rowCount, MAX_ROWS) * h > windowH - bottomReserve);
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
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={[optionStyles.field, open && (openUp ? optionStyles.fieldOpenUp : optionStyles.fieldOpenDown)]}>
        {selected?.color ? <View style={[optionStyles.dot, { backgroundColor: selected.color }]} /> : null}
        <Text
          variant={selected ? 'smallStrong' : 'bodyStrong'}
          color={selected ? colors.ink : colors.placeholder}
          style={{ flex: 1 }}
          numberOfLines={1}>
          {selected ? fmt(selected.label) : placeholder}
        </Text>
        <Ionicons name={open && openUp ? 'chevron-up' : 'chevron-down'} size={18} color={colors.ink} />
      </Pressable>

      {open && (
        <>
          {/* Invisible layer: tapping anywhere else on the form closes the list */}
          {!inline && <Pressable style={optionStyles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close list" />}
          <View
            style={[
              optionStyles.list,
              inline
                ? [optionStyles.listInline, { height: Math.min(rowCount, visibleRows ?? rowCount) * rowH }]
                : [openUp ? [optionStyles.listUp, { bottom: rowH }] : [optionStyles.listDown, { top: rowH }], { height: listH }],
            ]}>
            <ScrollView nestedScrollEnabled bounces={false} showsVerticalScrollIndicator={inline && visibleRows !== undefined}>
              {options.length === 0 && (
                <View style={[optionStyles.row, { height: rowH }]}>
                  <Text variant="smallStrong" color={colors.placeholder} style={{ flex: 1 }} numberOfLines={1}>
                    {emptyLabel}
                  </Text>
                  {onAddNew && (
                    <Pressable
                      hitSlop={8}
                      accessibilityRole="button"
                      onPress={() => {
                        setOpen(false);
                        onAddNew();
                      }}>
                      <Text variant="captionStrong" color={colors.tealText}>
                        {addNewLabel}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
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
                    o.key === value ? { backgroundColor: selectedColor } : pressed && { backgroundColor: colors.page },
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
  // Open: the field and the list read as one box, split by a thin divider.
  fieldOpenDown: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomColor: colors.mutedSoft, borderBottomWidth: 1 },
  fieldOpenUp: { borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopColor: colors.mutedSoft, borderTopWidth: 1 },
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
  listDown: { borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  listInline: { position: 'relative', borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  listUp: { borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.mutedSoft },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: borders.thin, borderColor: colors.ink },
});
