import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts, radii, shadow } from '@/design/theme';
import {
  STATS_PRESETS,
  endOfDay,
  formatRangeLabel,
  isSameDay,
  matchingPreset,
  presetRange,
  startOfDay,
  type StatsDateRange,
  type StatsPreset,
} from '@/utils/stats-date-range';

// StatsDateRange.html — shared by every screen under src/app/stats/. Same
// preset-chips + tap-to-pick-a-range calendar as reservations-list.tsx's
// own date sheet (FLOW.md explicitly calls for reusing that pattern), just
// against StatsPreset's 5 options instead of Reservations' own set.

function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function ChevronLeftIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function ChevronRightIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}

function formatShort(d: Date) {
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

export function StatsDateRangeSheet({
  visible,
  applied,
  onClose,
  onApply,
}: {
  visible: boolean;
  applied: StatsDateRange;
  onClose: () => void;
  onApply: (range: StatsDateRange) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => new Date(applied.from.getFullYear(), applied.from.getMonth(), 1));
  const [draftFrom, setDraftFrom] = useState<Date | null>(applied.from);
  const [draftTo, setDraftTo] = useState<Date | null>(applied.to);
  const [activePreset, setActivePreset] = useState<StatsPreset | null>(() => matchingPreset(applied.from, applied.to));

  if (!visible) return null;

  function selectPreset(preset: StatsPreset) {
    setActivePreset(preset);
    const range = presetRange(preset);
    setDraftFrom(range.from);
    setDraftTo(range.to);
    setViewMonth(new Date(range.from.getFullYear(), range.from.getMonth(), 1));
  }

  function selectDay(day: Date) {
    setActivePreset(null);
    if (!draftFrom || draftTo) {
      setDraftFrom(day);
      setDraftTo(null);
    } else if (day < draftFrom) {
      setDraftFrom(day);
    } else {
      setDraftTo(day);
    }
  }

  function reset() {
    selectPreset('This week');
  }

  function apply() {
    if (!draftFrom) return;
    const from = startOfDay(draftFrom);
    const to = endOfDay(draftTo ?? draftFrom);
    onApply({ from, to, label: activePreset ?? formatRangeLabel(from, to) });
  }

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close date range" />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Select date range</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <CloseIcon />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetRow} contentContainerStyle={styles.presetRowContent}>
          {STATS_PRESETS.map((preset) => (
            <Pressable
              key={preset}
              style={[styles.presetChip, activePreset === preset && styles.presetChipActive]}
              onPress={() => selectPreset(preset)}>
              <Text style={[styles.presetChipText, activePreset === preset && styles.presetChipTextActive]}>{preset}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.fromToRow}>
          <View style={styles.fromToBox}>
            <Text style={styles.fromToLabel}>FROM</Text>
            <Text style={styles.fromToValue}>{draftFrom ? formatShort(draftFrom) : '—'}</Text>
          </View>
          <View style={styles.fromToBox}>
            <Text style={styles.fromToLabel}>TO</Text>
            <Text style={styles.fromToValue}>{draftTo ? formatShort(draftTo) : '—'}</Text>
          </View>
        </View>

        <View style={styles.monthNavRow}>
          <Pressable onPress={() => setViewMonth(new Date(year, month - 1, 1))} hitSlop={8}>
            <ChevronLeftIcon />
          </Pressable>
          <Text style={styles.monthLabel}>{viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
          <Pressable onPress={() => setViewMonth(new Date(year, month + 1, 1))} hitSlop={8}>
            <ChevronRightIcon />
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
            <View key={i} style={styles.dayCell}>
              <Text style={styles.weekdayText}>{w}</Text>
            </View>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day, di) => {
              if (!day) return <View key={di} style={styles.dayCell} />;
              const inRange = draftFrom && draftTo && day >= startOfDay(draftFrom) && day <= startOfDay(draftTo);
              const isFrom = draftFrom && isSameDay(day, draftFrom);
              const isTo = draftTo && isSameDay(day, draftTo);
              const isEndpoint = isFrom || isTo;
              return (
                <View
                  key={di}
                  style={[styles.dayCell, inRange && styles.dayCellInRange, isFrom && styles.dayCellRangeStart, isTo && styles.dayCellRangeEnd]}>
                  <Pressable style={[styles.dayNum, isEndpoint && styles.dayNumEndpoint]} onPress={() => selectDay(day)}>
                    <Text style={[styles.dayNumText, isEndpoint && styles.dayNumTextEndpoint]}>{day.getDate()}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}

        <View style={styles.sheetFooter}>
          <Pressable style={styles.resetButton} onPress={reset}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </Pressable>
          <Pressable style={styles.applyButton} onPress={apply}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: 'rgba(18,23,58,0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '86%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 28,
    shadowColor: '#12173A',
    shadowOpacity: 0.2,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -10 },
    elevation: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 17,
    color: colors.navyInk,
  },
  presetRow: {
    flexGrow: 0,
    marginBottom: 14,
  },
  presetRowContent: {
    gap: 8,
  },
  presetChip: {
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: colors.bg,
  },
  presetChipActive: {
    backgroundColor: colors.navy,
  },
  presetChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  fromToRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  fromToBox: {
    flex: 1,
    borderWidth: 1.6,
    borderColor: colors.navy,
    borderRadius: radii.input,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  fromToLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    color: colors.textFaint,
  },
  fromToValue: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 14.5,
    color: colors.navy,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthLabel: {
    fontFamily: fonts.headingBold,
    fontSize: 13.5,
    color: colors.navyInk,
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellInRange: {
    backgroundColor: colors.navySoft,
  },
  dayCellRangeStart: {
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
  },
  dayCellRangeEnd: {
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  weekdayText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textFaint,
  },
  dayNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumEndpoint: {
    backgroundColor: colors.navy,
  },
  dayNumText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text,
  },
  dayNumTextEndpoint: {
    color: '#FFFFFF',
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  resetButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  applyButton: {
    flex: 2,
    height: 48,
    borderRadius: radii.input,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.button,
  },
  applyButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
});
