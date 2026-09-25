import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import type { Reservation } from '@/api/reservations';
import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { RESERVATION_STATUS_META, type ReservationStatus } from '@/constants/reservation';
import { colors, fonts, radii, shadow } from '@/design/theme';
import { useReservations } from '@/hooks/use-reservations';
import { getStayMetaText } from '@/utils/reservation-stay';

// -----------------------------------------------------------------------
// Flow B's entry point from design/design-reference/reservations.md:
// ReservationsList.html + its two overlay sheets, ReservationsFilterStatus
// .html and ReservationsDateRange.html. Tapping a guest row goes to the
// Reservation Detail hub (src/app/reservation/[id].tsx) — both screens
// share useReservations() (GET /check-ins) so the same guest's data shows
// in both.
//
// Search/status/date filtering all happen client-side over the full
// fetched list, same as they did over the old mock array — see
// useReservations() for why (GET /check-ins's own search/type query
// params are deliberately unused here).
//
// Matches hms-frontend-react's CheckInDateFilter.js/CheckInLists.js: the
// date filter defaults to "Today" as a real, already-applied filter (not
// just a label — see todayRange()), and a reservation matches a date
// range when its STAY overlaps that range (dateOfArrival <= to &&
// dateOfDeparture >= from), same as GET /check-ins's own from/to
// semantics on the backend (businesslogic/checkIn.js#getAllCheckIn) —
// not "arrival falls inside the range", which would wrongly hide an
// IN_HOUSE guest who arrived before today but is still staying.
// -----------------------------------------------------------------------

const STATUS_ORDER: ReservationStatus[] = ['RESERVED', 'IN_HOUSE', 'CHECKED_OUT', 'CANCELED'];
const DEFAULT_STATUS_FILTER = new Set<ReservationStatus>(['RESERVED', 'IN_HOUSE', 'CHECKED_OUT']);

const PRESETS = ['Today', 'Last 7 days', 'This month', 'Last month', 'All time'] as const;
type Preset = (typeof PRESETS)[number];

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function endOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}
function formatShort(d: Date) {
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}
function todayRange(): { from: Date; to: Date; label: string } {
  const today = startOfDay(new Date());
  return { from: today, to: endOfDay(today), label: 'Today' };
}
function isTodayRange(range: { from: Date; to: Date } | null) {
  if (!range) return false;
  const today = startOfDay(new Date());
  return isSameDay(range.from, today) && isSameDay(range.to, today);
}
function presetRange(preset: Preset): { from: Date; to: Date } | null {
  const today = startOfDay(new Date());
  switch (preset) {
    case 'Today':
      return { from: today, to: today };
    case 'Last 7 days': {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from, to: today };
    }
    case 'This month':
      return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: new Date(today.getFullYear(), today.getMonth() + 1, 0) };
    case 'Last month':
      return { from: new Date(today.getFullYear(), today.getMonth() - 1, 1), to: new Date(today.getFullYear(), today.getMonth(), 0) };
    case 'All time':
      return null;
  }
}

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function SearchIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={11} cy={11} r={7} />
      <Path d="m21 21-4.3-4.3" />
    </Svg>
  );
}
function ChevronDownIcon({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}
function FilterIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 5h16l-6 8v6l-4-2v-4z" />
    </Svg>
  );
}
function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6 9 17l-5-5" />
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

function StatusPill({ status }: { status: ReservationStatus }) {
  const meta = RESERVATION_STATUS_META[status];
  return (
    <View style={[styles.pill, { backgroundColor: meta.bg }]}>
      <Text style={[styles.pillText, { color: meta.text }]}>{meta.label.toUpperCase()}</Text>
    </View>
  );
}

function GuestRow({
  guest,
  onPress,
  isLast,
}: {
  guest: Reservation;
  onPress: () => void;
  isLast: boolean;
}) {
  return (
    <Pressable style={[styles.row, !isLast && styles.rowDivider]} onPress={onPress}>
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {guest.guestName}
        </Text>
        <Text style={styles.rowMeta}>
          Room {guest.room} · {getStayMetaText(guest)}
        </Text>
      </View>
      <StatusPill status={guest.status} />
    </Pressable>
  );
}

function FilterStatusSheet({
  visible,
  applied,
  onClose,
  onApply,
}: {
  visible: boolean;
  applied: Set<ReservationStatus>;
  onClose: () => void;
  onApply: (next: Set<ReservationStatus>) => void;
}) {
  const [draft, setDraft] = useState(applied);

  if (!visible) return null;

  function toggle(status: ReservationStatus) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }

  return (
    <>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close filter" />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Filter by status</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <CloseIcon />
          </Pressable>
        </View>

        <View style={styles.chipGrid}>
          {STATUS_ORDER.map((status) => {
            const meta = RESERVATION_STATUS_META[status];
            const active = draft.has(status);
            return (
              <Pressable
                key={status}
                style={[
                  styles.statusChip,
                  { backgroundColor: active ? meta.bg : colors.surface, borderColor: active ? meta.text : colors.border },
                ]}
                onPress={() => toggle(status)}>
                <View style={[styles.statusChipDot, { backgroundColor: meta.dot }]} />
                <Text style={[styles.statusChipLabel, !active && { color: colors.textMuted }]}>{meta.label}</Text>
                {active && <CheckIcon color={meta.text} />}
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.clearAll} onPress={() => setDraft(new Set())}>
          <Text style={styles.clearAllText}>Clear all</Text>
        </Pressable>

        <Pressable style={styles.applyButton} onPress={() => onApply(draft)}>
          <Text style={styles.applyButtonText}>Apply filters ({draft.size})</Text>
        </Pressable>
      </View>
    </>
  );
}

function DateRangeSheet({
  visible,
  applied,
  onClose,
  onApply,
}: {
  visible: boolean;
  applied: { from: Date; to: Date; label: string } | null;
  onClose: () => void;
  onApply: (range: { from: Date; to: Date; label: string } | null) => void;
}) {
  // Seeded from the currently-applied range at mount, so opening the sheet
  // while "Today" (the default) is active shows Today selected — both the
  // preset chip and the day itself highlighted in the calendar — same as
  // hms-frontend-react's CheckInDateFilter.js opening with its own active
  // preset already marked. Only recognizes the Today/All-time extremes by
  // name; a previously-applied "Last 7 days" etc. still shows its actual
  // days highlighted on the calendar, just without that chip lit up.
  const [viewMonth, setViewMonth] = useState(() => {
    const base = applied?.from ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [draftFrom, setDraftFrom] = useState<Date | null>(applied?.from ?? null);
  const [draftTo, setDraftTo] = useState<Date | null>(applied?.to ?? null);
  const [activePreset, setActivePreset] = useState<Preset | null>(() => {
    if (isTodayRange(applied)) return 'Today';
    if (!applied) return 'All time';
    return null;
  });

  if (!visible) return null;

  function selectPreset(preset: Preset) {
    setActivePreset(preset);
    const range = presetRange(preset);
    setDraftFrom(range?.from ?? null);
    setDraftTo(range?.to ?? null);
    if (range) setViewMonth(new Date(range.from.getFullYear(), range.from.getMonth(), 1));
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
    setDraftFrom(null);
    setDraftTo(null);
    setActivePreset('All time');
  }

  function apply() {
    // A still-active preset keeps its own name as the label ("Today",
    // "Last 7 days", ...) rather than a formatted date range — matching
    // hms-frontend-react's trigger label, which only falls back to a
    // formatted range once the user has hand-picked calendar days.
    if (activePreset && activePreset !== 'All time' && draftFrom) {
      onApply({ from: startOfDay(draftFrom), to: endOfDay(draftTo ?? draftFrom), label: activePreset });
    } else if (draftFrom && draftTo) {
      const label = isSameDay(draftFrom, draftTo)
        ? formatShort(draftFrom)
        : `${formatShort(draftFrom)}–${formatShort(draftTo)}`;
      onApply({ from: startOfDay(draftFrom), to: endOfDay(draftTo), label });
    } else if (draftFrom) {
      onApply({ from: startOfDay(draftFrom), to: endOfDay(draftFrom), label: formatShort(draftFrom) });
    } else {
      onApply(null);
    }
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
      <View style={[styles.sheet, styles.dateSheet]}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Select dates</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <CloseIcon />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetRow} contentContainerStyle={styles.presetRowContent}>
          {PRESETS.map((preset) => (
            <Pressable
              key={preset}
              style={[styles.presetChip, activePreset === preset && styles.presetChipActive]}
              onPress={() => selectPreset(preset)}>
              <Text style={[styles.presetChipText, activePreset === preset && styles.presetChipTextActive]}>
                {preset}
              </Text>
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
          <Text style={styles.monthLabel}>
            {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
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
                  style={[
                    styles.dayCell,
                    inRange && styles.dayCellInRange,
                    isFrom && styles.dayCellRangeStart,
                    isTo && styles.dayCellRangeEnd,
                  ]}>
                  <Pressable
                    style={[styles.dayNum, isEndpoint && styles.dayNumEndpoint]}
                    onPress={() => selectDay(day)}>
                    <Text style={[styles.dayNumText, isEndpoint && styles.dayNumTextEndpoint]}>
                      {day.getDate()}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}

        <View style={styles.dateSheetFooter}>
          <Pressable style={styles.resetButton} onPress={reset}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </Pressable>
          <Pressable style={styles.applyButtonSmall} onPress={apply}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function ReservationsListScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(DEFAULT_STATUS_FILTER);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date; label: string } | null>(todayRange);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);

  const { data: reservations, isLoading, isError, error, refetch, isRefetching } = useReservations();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (reservations ?? []).filter((guest) => {
      if (
        q &&
        !guest.guestName.toLowerCase().includes(q) &&
        !guest.room.toLowerCase().includes(q) &&
        !guest.reservationNumber.toLowerCase().includes(q)
      )
        return false;
      if (!statusFilter.has(guest.status)) return false;
      if (dateRange && (guest.arrivalDate > dateRange.to || guest.departureDate < dateRange.from)) return false;
      return true;
    });
  }, [reservations, search, statusFilter, dateRange]);

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackIcon />
        </Pressable>
        <Text style={styles.title}>Reservations</Text>
      </View>

      <View style={styles.searchWrapper}>
        <View pointerEvents="none" style={styles.searchIcon}>
          <SearchIcon />
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search guest, room or res. no."
          placeholderTextColor={colors.textFaint}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          style={isTodayRange(dateRange) ? styles.dateRangePill : styles.dateRangePillActive}
          onPress={() => setDateSheetOpen(true)}>
          <Text style={isTodayRange(dateRange) ? styles.dateRangeText : styles.dateRangeTextActive}>
            {dateRange?.label ?? 'All time'}
          </Text>
          <ChevronDownIcon color={isTodayRange(dateRange) ? colors.navyInk : colors.navy} />
        </Pressable>
        <View style={styles.controlsDivider} />
        <Pressable style={styles.filterTrigger} onPress={() => setFilterSheetOpen(true)}>
          <FilterIcon color={statusFilter.size < STATUS_ORDER.length ? colors.navy : colors.textMuted} />
          <Text
            style={
              statusFilter.size < STATUS_ORDER.length ? styles.filterTriggerTextActive : styles.filterTriggerText
            }>
            Filter
          </Text>
          {statusFilter.size < STATUS_ORDER.length && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{statusFilter.size}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.navy} />}>
        {isLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={colors.navy} />
          </View>
        ) : isError ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateErrorText}>{error.message}</Text>
            <Pressable style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>No reservations match this filter.</Text>
          </View>
        ) : (
          filtered.map((guest, i) => (
            <GuestRow
              key={guest.id}
              guest={guest}
              isLast={i === filtered.length - 1}
              onPress={() => router.push(`/reservation/${guest.id}`)}
            />
          ))
        )}
      </ScrollView>

      <FilterStatusSheet
        visible={filterSheetOpen}
        applied={statusFilter}
        onClose={() => setFilterSheetOpen(false)}
        onApply={(next) => {
          setStatusFilter(next);
          setFilterSheetOpen(false);
        }}
      />

      <DateRangeSheet
        visible={dateSheetOpen}
        applied={dateRange}
        onClose={() => setDateSheetOpen(false)}
        onApply={(range) => {
          setDateRange(range);
          setDateSheetOpen(false);
        }}
      />
    </KeyboardSafeView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 17,
    color: colors.navyInk,
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 33,
    zIndex: 1,
  },
  searchInput: {
    height: 42,
    borderRadius: radii.input,
    backgroundColor: colors.bg,
    paddingLeft: 38,
    paddingRight: 12,
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.text,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  dateRangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateRangeText: {
    fontFamily: fonts.headingBold,
    fontSize: 14.5,
    color: colors.navyInk,
  },
  dateRangePillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.navySoft,
    borderRadius: 9,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  dateRangeTextActive: {
    fontFamily: fonts.headingBold,
    fontSize: 14.5,
    color: colors.navy,
  },
  controlsDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
  },
  filterTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  filterTriggerText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13.5,
    color: colors.textMuted,
  },
  filterTriggerTextActive: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.navy,
  },
  filterBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9.5,
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  stateText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.textMuted,
    textAlign: 'center',
  },
  stateErrorText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.danger,
    textAlign: 'center',
  },
  retryButton: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: radii.input,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: {
    flexShrink: 1,
    gap: 3,
  },
  rowName: {
    fontFamily: fonts.headingBold,
    fontSize: 14.5,
    color: colors.navyInk,
  },
  rowMeta: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  pill: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 11,
  },
  pillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
  },
  scrim: {
    backgroundColor: 'rgba(18,23,58,0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
  dateSheet: {
    maxHeight: '86%',
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
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusChip: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 14,
    borderWidth: 1.6,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statusChipDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  statusChipLabel: {
    flexGrow: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.navyInk,
  },
  clearAll: {
    alignItems: 'center',
    marginTop: 16,
  },
  clearAllText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.coral,
  },
  applyButton: {
    height: 50,
    borderRadius: radii.input,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    ...shadow.button,
  },
  applyButtonSmall: {
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
  presetRow: {
    flexGrow: 0,
    marginBottom: 14,
  },
  presetRowContent: {
    gap: 8,
  },
  presetChip: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.bg,
  },
  presetChipActive: {
    backgroundColor: colors.navy,
  },
  presetChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
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
  dateSheetFooter: {
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
});
