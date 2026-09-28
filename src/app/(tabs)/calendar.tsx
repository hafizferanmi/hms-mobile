import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';

import type { HousekeepingRoomDto } from '@/api/rooms';
import type { Reservation } from '@/api/reservations';

import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { CLEAN_STATUS_META } from '@/constants/housekeeping';
import { RESERVATION_STATUS_META, type ReservationStatus } from '@/constants/reservation';
import { colors, fonts } from '@/design/theme';
import { useHousekeepingRooms } from '@/hooks/use-housekeeping';
import { useReservations } from '@/hooks/use-reservations';

// -----------------------------------------------------------------------
// This screen is the mobile port of hms-frontend-react's CalendarPage (see
// src/components/CalendarPage/*.js there): the room x date grid, per-room
// housekeeping status, per-date occupancy bar, and the Reserved/In House/
// Checked Out status legend are all modeled on that real feature, sourced
// from real data (GET /rooms via useHousekeepingRooms — same query already
// used by housekeeping.tsx — and GET /check-ins via useReservations).
//
// The desktop grid is one CSS element that scrolls both axes at once, with
// `position: sticky` freezing the room column (horizontal scroll) and the
// date/occupancy header rows (vertical scroll) for free — RN's ScrollView
// has no equivalent for a frozen column, so this is built as two synced
// panes instead: a fixed-width vertical ScrollView for room labels (left)
// and a horizontal ScrollView wrapping a vertical ScrollView for the date
// cells (right), with their vertical scroll offsets mirrored via onScroll.
// Both use `stickyHeaderIndices={[0, 1]}` for the date/occupancy header
// rows, RN's built-in equivalent of desktop's `position: sticky; top: 0`.
// The date window itself matches desktop's WINDOW_DAYS_BEFORE/AFTER (15/15
// => 31 days, i.e. "30 days" of data) exactly — see CalendarPageContainer.js.
// -----------------------------------------------------------------------

// Just wide enough for a room number + status dot — unlike desktop's fixed
// 224px ROOM_COLUMN_WIDTH, this column doesn't also need to fit the
// room-type name: category dividers render as a full-width overlay instead
// (see AnimatedPressable/categoryOffsets below), so this can stay narrow.
const ROOM_COL_WIDTH = 84;
const COL_WIDTH = 60;
const HEADER_ROW_HEIGHT = 54;
const OCCUPANCY_ROW_HEIGHT = 44;
const CATEGORY_ROW_HEIGHT = 32;
const ROOM_ROW_HEIGHT = 56;
const SCREEN_PADDING = 16;
const BAR_GAP = 3;
// Mirrors CalendarBookingBar.js's SLANT (the depth of the "keycard" chevron
// cut) and its own top/bottom:8-equivalent inset (here 6, since mobile's
// row is shorter) — signals a night-to-night stay the same way desktop's
// clip-path parallelogram does, via an SVG polygon instead (RN has no
// clip-path on a plain View).
const SLANT = 16;
const BAR_HEIGHT = ROOM_ROW_HEIGHT - 12;
const WINDOW_DAYS_BEFORE = 15;
const WINDOW_DAYS_AFTER = 15;

const LEGEND_STATUSES: ReservationStatus[] = ['RESERVED', 'IN_HOUSE', 'CHECKED_OUT'];

type CalendarDate = {
  dateObj: Date;
  day: string;
  date: number;
  month: string;
  isToday: boolean;
  isFocusDate: boolean;
};

type BookingBar = {
  id: string;
  guestName: string;
  status: ReservationStatus;
  startCol: number;
  span: number;
};

type RoomCategory = {
  id: string;
  name: string;
  rooms: HousekeepingRoomDto[];
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildDateWindow(centerDate: Date, daysBefore: number, daysAfter: number): CalendarDate[] {
  const today = new Date();
  const dates: CalendarDate[] = [];
  for (let i = -daysBefore; i <= daysAfter; i++) {
    const d = new Date(centerDate);
    d.setDate(centerDate.getDate() + i);
    dates.push({
      dateObj: d,
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      isToday: isSameDay(d, today),
      isFocusDate: i === 0,
    });
  }
  return dates;
}

function dayIndexForDate(dates: CalendarDate[], date: Date) {
  return dates.findIndex((d) => isSameDay(d.dateObj, date));
}

function formatDateRangeLabel(dates: CalendarDate[]) {
  if (!dates.length) return '';
  const first = dates[0];
  const last = dates[dates.length - 1];
  return `${first.month} ${first.date} — ${last.month} ${last.date}, ${last.dateObj.getFullYear()}`;
}

// Mirrors CalendarPage/data/adapters.js's buildTimelineBookings: clamps a
// stay that starts or ends outside the visible window to the nearest edge
// column instead of dropping it, and excludes CANCELED (doesn't occupy a
// room).
function buildBookingsByRoom(reservations: Reservation[], dates: CalendarDate[]) {
  const map: Record<string, BookingBar[]> = {};
  if (!dates.length) return map;

  const windowStart = dates[0].dateObj;
  const windowEnd = dates[dates.length - 1].dateObj;

  for (const r of reservations) {
    if (r.status === 'CANCELED' || !r.roomId) continue;
    if (r.departureDate < windowStart || r.arrivalDate > windowEnd) continue;

    let startCol = dayIndexForDate(dates, r.arrivalDate);
    let endCol = dayIndexForDate(dates, r.departureDate);
    const nights = Math.max(1, Math.round((r.departureDate.getTime() - r.arrivalDate.getTime()) / 86400000));

    if (startCol === -1) startCol = r.arrivalDate < windowStart ? 0 : dates.length - 1;
    if (endCol === -1) endCol = Math.min(dates.length - 1, startCol + nights);
    const span = Math.max(1, endCol - startCol);

    if (!map[r.roomId]) map[r.roomId] = [];
    map[r.roomId].push({ id: r.id, guestName: r.guestName, status: r.status, startCol, span });
  }
  return map;
}

// Mirrors computeDemand: a room counts as occupied on the checkout day
// itself (the guest was there for part of it), even though its booking bar
// stops the night before (span excludes the checkout column).
function computeOccupancy(reservations: Reservation[], dates: CalendarDate[], totalRooms: number) {
  return dates.map((d) => {
    const occupiedRoomIds = new Set<string>();
    for (const r of reservations) {
      if (r.status === 'CANCELED' || !r.roomId) continue;
      const startsBeforeOrOnDay = r.arrivalDate <= d.dateObj;
      const endsAfterDay = r.departureDate > d.dateObj || isSameDay(r.departureDate, d.dateObj);
      if (startsBeforeOrOnDay && endsAfterDay) occupiedRoomIds.add(r.roomId);
    }
    return Math.round((occupiedRoomIds.size / (totalRooms || 1)) * 100);
  });
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function getHeatColor(pct: number) {
  if (pct < 40) return colors.slate;
  if (pct < 70) return colors.navy;
  return colors.danger;
}

function SearchIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={11} cy={11} r={7} />
      <Path d="m21 21-4.3-4.3" />
    </Svg>
  );
}

function RefreshIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <Path d="M21 4v5h-5" />
    </Svg>
  );
}

function FilterIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 5h16l-6 8v6l-4-2v-4z" />
    </Svg>
  );
}

function MenuIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}
// Mirrors hms-frontend-react's CalendarToolbar.js "Check availability"
// button — a calendar glyph with a checkmark, distinct from the plain
// magnifying-glass SearchIcon already in this header.
function CheckAvailabilityIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={16} rx={2} />
      <Path d="M3 10h18" />
      <Path d="M8 15l2.5 2.5L16 12" />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <View style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}>
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M9 5l7 7-7 7" />
      </Svg>
    </View>
  );
}

function StepLeftIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 6l-6 6 6 6" />
    </Svg>
  );
}

function StepRightIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

const MENU_ITEMS = [
  'Daily View',
  'Switch Orientation',
  'Unassigned',
  'Legend',
  'Switch Property',
  'Bulk Dirty/Clean',
  'Rate',
  'Sort',
  'Bulk Open/Close',
];

// Category dividers render as a full-width overlay above both scroll panes
// (see the categoryOffsets/scrollY plumbing below) rather than being
// confined to the narrow room-number column, so a long room-type name is
// never truncated — matching the desktop grid's category row, which spans
// every date column, not just its own sticky-left label cell. Defined at
// module scope (not per-render) since Animated.createAnimatedComponent
// returns a distinct component type each call, which would remount on
// every render if created inside CalendarScreen.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const [focusDate, setFocusDate] = useState(() => new Date());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: rooms, isLoading: roomsLoading, refetch: refetchRooms } = useHousekeepingRooms();
  const { data: reservations, isLoading: reservationsLoading, refetch: refetchReservations } = useReservations();

  const dates = useMemo(() => buildDateWindow(focusDate, WINDOW_DAYS_BEFORE, WINDOW_DAYS_AFTER), [focusDate]);
  const totalGridWidth = dates.length * COL_WIDTH;

  const roomCategories = useMemo<RoomCategory[]>(() => {
    const byType = new Map<string, RoomCategory>();
    for (const r of rooms ?? []) {
      const key = r.roomTypeId?._id ?? 'unknown';
      const name = r.roomTypeId?.name ?? 'Other';
      if (!byType.has(key)) byType.set(key, { id: key, name, rooms: [] });
      byType.get(key)!.rooms.push(r);
    }
    for (const group of byType.values()) {
      group.rooms.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
    }
    return Array.from(byType.values());
  }, [rooms]);

  const hasNoRooms = !roomsLoading && roomCategories.length === 0;

  const bookingsByRoom = useMemo(
    () => buildBookingsByRoom(reservations ?? [], dates),
    [reservations, dates],
  );

  const occupancy = useMemo(
    () => computeOccupancy(reservations ?? [], dates, rooms?.length ?? 0),
    [reservations, dates, rooms],
  );

  // Y offset of each category divider within the (virtual, unscrolled)
  // room list — drives the full-width divider overlay below, which needs
  // to know where each divider sits so it can track the list's scroll
  // position independently of either scroll pane's own clipped width.
  const categoryOffsets = useMemo(() => {
    let y = 0;
    return roomCategories.map((cat) => {
      const top = y;
      y += CATEGORY_ROW_HEIGHT + (collapsed.has(cat.id) ? 0 : cat.rooms.length * ROOM_ROW_HEIGHT);
      return { id: cat.id, name: cat.name, count: cat.rooms.length, top };
    });
  }, [roomCategories, collapsed]);

  // --- synced scroll: the grid is split into 4 panes since nesting a
  // vertical ScrollView with `stickyHeaderIndices` inside a horizontal one
  // (the first attempt at this) breaks RN's sticky-header positioning math
  // — it renders the "sticky" rows as free-floating ghosts scattered down
  // the body instead of pinned at the top. Splitting into a fixed corner
  // (room/occupancy labels), a horizontal-only pane (date/occupancy
  // header), a vertical-only pane (room labels), and the body (scrolls
  // both) avoids that entirely: each scrolling pair is kept in sync via
  // onScroll -> scrollTo, guarded against feedback loops.
  const labelScrollRef = useRef<ScrollView>(null);
  const headerScrollRef = useRef<ScrollView>(null);
  const bodyHorizontalRef = useRef<ScrollView>(null);
  const bodyVerticalRef = useRef<ScrollView>(null);
  const verticalSyncSourceRef = useRef<'label' | 'body' | null>(null);
  const horizontalSyncSourceRef = useRef<'header' | 'body' | null>(null);
  // Drives the category-divider overlay's position, kept a plain frame
  // behind real scroll events (not native-driver-animated) — Animated.event
  // would need to pass the label pane's sync callback in as its `listener`,
  // and the lint's react-hooks/refs rule flags that as a ref potentially
  // read during render (it isn't, but there's no way to prove that to a
  // static check). Plain .setValue() calls from both onScroll handlers
  // below are simpler and just as correct here — this only repositions a
  // divider bar, not a gesture-critical animation, so there's nothing
  // useNativeDriver would meaningfully improve. Kept in useState rather
  // than useRef().current since an Animated.Value is meant to be read
  // during render (it's passed straight into a style prop), which the
  // ref-during-render rule otherwise flags.
  const [scrollY] = useState(() => new Animated.Value(0));

  const handleLabelScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.setValue(e.nativeEvent.contentOffset.y);
    if (verticalSyncSourceRef.current === 'body') {
      verticalSyncSourceRef.current = null;
      return;
    }
    verticalSyncSourceRef.current = 'label';
    bodyVerticalRef.current?.scrollTo({ y: e.nativeEvent.contentOffset.y, animated: false });
  }, [scrollY]);

  const handleBodyVerticalScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.setValue(e.nativeEvent.contentOffset.y);
    if (verticalSyncSourceRef.current === 'label') {
      verticalSyncSourceRef.current = null;
      return;
    }
    verticalSyncSourceRef.current = 'body';
    labelScrollRef.current?.scrollTo({ y: e.nativeEvent.contentOffset.y, animated: false });
  }, [scrollY]);

  const handleHeaderScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (horizontalSyncSourceRef.current === 'body') {
      horizontalSyncSourceRef.current = null;
      return;
    }
    horizontalSyncSourceRef.current = 'header';
    bodyHorizontalRef.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false });
  }, []);

  const handleBodyHorizontalScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (horizontalSyncSourceRef.current === 'header') {
      horizontalSyncSourceRef.current = null;
      return;
    }
    horizontalSyncSourceRef.current = 'body';
    headerScrollRef.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false });
  }, []);

  // Keeps the focused column in view whenever it changes (initial mount,
  // "Today", stepping a window at a time, or tapping a date header cell) —
  // mirrors CalendarPageContainer.js's focusColumnRef effect. Scrolls both
  // horizontal panes directly rather than relying on the sync handlers
  // above, since a programmatic scrollTo isn't guaranteed to fire onScroll
  // on every platform.
  useEffect(() => {
    const focusIndex = dates.findIndex((d) => d.isFocusDate);
    if (focusIndex === -1) return;
    const viewportWidth = windowWidth - SCREEN_PADDING * 2 - ROOM_COL_WIDTH;
    const targetX = Math.max(0, focusIndex * COL_WIDTH - viewportWidth / 2 + COL_WIDTH / 2);
    const raf = requestAnimationFrame(() => {
      bodyHorizontalRef.current?.scrollTo({ x: targetX, animated: true });
      headerScrollRef.current?.scrollTo({ x: targetX, animated: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [dates, windowWidth]);

  function toggleCategory(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function stepWindow(delta: number) {
    setFocusDate((d) => {
      const next = new Date(d);
      next.setDate(d.getDate() + delta);
      return next;
    });
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetchRooms(), refetchReservations()]);
    setRefreshing(false);
  }

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.searchWrapper}>
          <View pointerEvents="none" style={styles.searchIcon}>
            <SearchIcon />
          </View>
          {/* TODO(data): doesn't filter the grid yet — no bookings/rooms
              search endpoint is wired up. */}
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search Name, Email, Res ID"
            placeholderTextColor={colors.textFaint}
            style={styles.searchInput}
          />
        </View>
        <Pressable hitSlop={8} accessibilityLabel="Refresh" onPress={handleRefresh} disabled={refreshing}>
          {refreshing ? <ActivityIndicator size="small" color={colors.navy} /> : <RefreshIcon />}
        </Pressable>
        {/* TODO(filter): no calendar-specific filter sheet is specced yet
            (Filter.html's sheet is scoped to Reservations). */}
        <Pressable hitSlop={8} accessibilityLabel="Filter">
          <FilterIcon />
        </Pressable>
        <Pressable
          hitSlop={8}
          accessibilityLabel="Check availability"
          onPress={() => router.push('/check-availability')}>
          <CheckAvailabilityIcon />
        </Pressable>
        <Pressable hitSlop={8} accessibilityLabel="More" onPress={() => setMenuOpen(true)}>
          <MenuIcon />
        </Pressable>
      </View>

      <View style={styles.toolbarRow}>
        <View style={styles.stepGroup}>
          <Pressable style={styles.stepButton} onPress={() => stepWindow(-(WINDOW_DAYS_BEFORE + WINDOW_DAYS_AFTER + 1))} accessibilityLabel="Earlier">
            <StepLeftIcon />
          </Pressable>
          <Pressable style={styles.todayPill} onPress={() => setFocusDate(new Date())}>
            <Text style={styles.todayPillText}>Today</Text>
          </Pressable>
          <Pressable style={styles.stepButton} onPress={() => stepWindow(WINDOW_DAYS_BEFORE + WINDOW_DAYS_AFTER + 1)} accessibilityLabel="Later">
            <StepRightIcon />
          </Pressable>
        </View>
        <Text style={styles.rangeLabel} numberOfLines={1}>
          {formatDateRangeLabel(dates)}
        </Text>
      </View>

      <View style={styles.gridBorderTop} />

      {roomsLoading || reservationsLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.navy} />
        </View>
      ) : hasNoRooms ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No rooms to show yet</Text>
          <Text style={styles.emptySubtitle}>Once you add a room type, each room will appear here as its own row.</Text>
        </View>
      ) : (
        <View style={styles.gridRoot}>
          <View style={styles.gridTopRow}>
            <View style={styles.corner}>
              <View style={[styles.rowLabel, { height: HEADER_ROW_HEIGHT }]}>
                <Text style={styles.rowLabelText}>Rooms</Text>
              </View>
              <View style={[styles.rowLabel, { height: OCCUPANCY_ROW_HEIGHT }]}>
                <Text style={styles.rowLabelTextSmall}>Occupancy</Text>
              </View>
            </View>

            <ScrollView
              ref={headerScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onScroll={handleHeaderScroll}
              scrollEventThrottle={16}
              style={styles.headerScroll}>
              <View>
                <View style={[styles.headerRow, { width: totalGridWidth }]}>
                  {dates.map((d, i) => (
                    <Pressable
                      key={i}
                      style={[styles.dateHeaderCell, { width: COL_WIDTH }]}
                      onPress={() => setFocusDate(d.dateObj)}>
                      {d.isToday && (
                        <View style={styles.todayFlag}>
                          <Text style={styles.todayFlagText}>TODAY</Text>
                        </View>
                      )}
                      {!d.isToday && d.isFocusDate && (
                        <View style={styles.selectedFlag}>
                          <Text style={styles.todayFlagText}>SELECTED</Text>
                        </View>
                      )}
                      <Text style={styles.dateHeaderWeekday}>{d.day}</Text>
                      <Text style={styles.dateHeaderDate}>{d.date}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={[styles.occupancyRow, { width: totalGridWidth }]}>
                  {occupancy.map((pct, i) => (
                    <View key={i} style={[styles.occupancyCell, { width: COL_WIDTH }]}>
                      <View style={styles.occupancyTrack}>
                        <View style={[styles.occupancyBar, { width: `${pct}%`, backgroundColor: getHeatColor(pct) }]} />
                      </View>
                      <Text style={styles.occupancyPct}>{pct}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>

          <View style={styles.gridBottomRow}>
            <ScrollView
              ref={labelScrollRef}
              style={styles.leftColumn}
              // Matches the body pane's own bottom padding below exactly —
              // both panes need the same scrollable content height, or
              // their vertical sync would leave one able to scroll further
              // than the other. The 84 itself matches this screen's own FAB
              // offset and index.tsx's, this app's established clearance
              // for the floating native tab bar (see app-tabs.tsx), which
              // doesn't contribute to useSafeAreaInsets().bottom itself.
              contentContainerStyle={{ paddingBottom: insets.bottom + 84 }}
              showsVerticalScrollIndicator={false}
              onScroll={handleLabelScroll}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled">
              {roomCategories.map((cat) => {
                const isCollapsed = collapsed.has(cat.id);
                return (
                  <View key={cat.id}>
                    {/* Content lives in the full-width overlay below — this
                        is just a same-height spacer so the room rows after
                        it line up. */}
                    <View style={styles.categoryRowLeft} />

                    {!isCollapsed &&
                      cat.rooms.map((room) => {
                        const statusMeta = CLEAN_STATUS_META[room.cleanStatus];
                        return (
                          <View key={room._id} style={styles.roomLabelRow}>
                            <View
                              style={[styles.roomStatusDot, { backgroundColor: statusMeta.color }]}
                              accessibilityLabel={statusMeta.label}
                            />
                            <Text style={styles.roomNumber}>{room.number}</Text>
                          </View>
                        );
                      })}
                  </View>
                );
              })}
            </ScrollView>

            <ScrollView
              ref={bodyHorizontalRef}
              horizontal
              showsHorizontalScrollIndicator
              style={styles.rightColumnOuter}
              contentContainerStyle={{ width: totalGridWidth }}
              onScroll={handleBodyHorizontalScroll}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled">
              <ScrollView
                ref={bodyVerticalRef}
                style={{ width: totalGridWidth, flex: 1 }}
                contentContainerStyle={{ paddingBottom: insets.bottom + 84 }}
                showsVerticalScrollIndicator={false}
                onScroll={handleBodyVerticalScroll}
                scrollEventThrottle={16}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled">
                {roomCategories.map((cat) => {
                  const isCollapsed = collapsed.has(cat.id);
                  return (
                    <View key={cat.id}>
                      <View style={[styles.categoryRowRight, { width: totalGridWidth }]} />

                      {!isCollapsed &&
                        cat.rooms.map((room) => {
                          const roomBookings = bookingsByRoom[room._id] ?? [];
                          return (
                            <View key={room._id} style={[styles.dayCellsRow, { width: totalGridWidth }]}>
                              {dates.map((_, i) => (
                                <View key={i} style={[styles.dayCell, { width: COL_WIDTH }]} />
                              ))}

                              {roomBookings.map((booking) => {
                                const palette = RESERVATION_STATUS_META[booking.status];
                                // Matches CalendarBookingBar.js's inset math
                                // exactly: the bar spans one extra column
                                // beyond the nights stayed, then insets half
                                // a column on each side, so it starts at the
                                // midpoint of the arrival day (freeing the
                                // other half for a same-day checkout/
                                // checkin turnover) and ends at the midpoint
                                // of the checkout day rather than its edge.
                                const barWidth = booking.span * COL_WIDTH - BAR_GAP * 2;
                                const slant = Math.min(SLANT, barWidth / 3);
                                const contentWidth = barWidth - (slant + 6) - (slant + 4);
                                const showDetails = contentWidth > 70;
                                return (
                                  <Pressable
                                    key={booking.id}
                                    onPress={() => router.push(`/reservation/${booking.id}`)}
                                    style={[
                                      styles.bookingBar,
                                      { left: (booking.startCol + 0.5) * COL_WIDTH + BAR_GAP, width: barWidth },
                                    ]}>
                                    <Svg width={barWidth} height={BAR_HEIGHT} style={StyleSheet.absoluteFill}>
                                      <Polygon
                                        points={`${slant},0 ${barWidth},0 ${barWidth - slant},${BAR_HEIGHT} 0,${BAR_HEIGHT}`}
                                        fill={palette.bg}
                                        stroke={palette.text}
                                        strokeWidth={1}
                                      />
                                    </Svg>
                                    <View style={[styles.bookingBarContent, { paddingLeft: slant + 6, paddingRight: slant + 4 }]}>
                                      <View style={[styles.bookingBadge, { borderColor: palette.text }]}>
                                        <Text style={[styles.bookingBadgeText, { color: palette.text }]}>
                                          {getInitials(booking.guestName)}
                                        </Text>
                                      </View>
                                      {showDetails && (
                                        <>
                                          <View style={[styles.bookingDivider, { borderLeftColor: palette.text }]} />
                                          <View style={styles.bookingTextCol}>
                                            <Text style={[styles.bookingName, { color: palette.text }]} numberOfLines={1}>
                                              {booking.guestName}
                                            </Text>
                                            <Text style={[styles.bookingStatusLabel, { color: palette.text }]} numberOfLines={1}>
                                              {palette.label}
                                            </Text>
                                          </View>
                                        </>
                                      )}
                                    </View>
                                  </Pressable>
                                );
                              })}
                            </View>
                          );
                        })}
                    </View>
                  );
                })}
              </ScrollView>
            </ScrollView>

            {categoryOffsets.map((cat) => (
              <AnimatedPressable
                key={cat.id}
                onPress={() => toggleCategory(cat.id)}
                style={[
                  styles.categoryOverlay,
                  { top: cat.top, transform: [{ translateY: Animated.multiply(scrollY, -1) }] },
                ]}>
                <ChevronIcon expanded={!collapsed.has(cat.id)} />
                <Text style={styles.categoryOverlayName} numberOfLines={1} ellipsizeMode="tail">
                  {cat.name}
                </Text>
                <View style={styles.categoryCount}>
                  <Text style={styles.categoryCountText}>{cat.count}</Text>
                </View>
              </AnimatedPressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.legend}>
        {LEGEND_STATUSES.map((status) => {
          const meta = RESERVATION_STATUS_META[status];
          return (
            <View key={status} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: meta.bg, borderColor: meta.text }]} />
              <Text style={styles.legendLabel}>{meta.label}</Text>
            </View>
          );
        })}
      </View>

      {/* TODO(nav): the FAB would start a new reservation for the focused
          date — no such flow exists in the design handoff yet. */}
      <Pressable style={[styles.fab, { bottom: 84 }]}>
        <PlusIcon />
      </Pressable>

      {menuOpen && (
        <>
          <Pressable
            style={[StyleSheet.absoluteFill, styles.scrim]}
            onPress={() => setMenuOpen(false)}
            accessibilityLabel="Close menu"
          />
          <View style={[styles.menuCard, { top: insets.top + 46 }]}>
            {MENU_ITEMS.map((label, i) => (
              // TODO(nav): none of these calendar tools are specced yet.
              <Pressable
                key={label}
                style={[styles.menuItem, i < MENU_ITEMS.length - 1 && styles.menuItemDivider]}
                onPress={() => setMenuOpen(false)}>
                <Text style={styles.menuItemText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
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
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 10,
  },
  searchWrapper: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  searchIcon: {
    marginLeft: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 10,
  },
  stepGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayPill: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  rangeLabel: {
    flexShrink: 1,
    fontFamily: fonts.bodySemibold,
    fontSize: 11.5,
    color: colors.textMuted,
    textAlign: 'right',
  },
  gridBorderTop: {
    height: 1,
    backgroundColor: colors.border,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 6,
  },
  emptyTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textFaint,
    textAlign: 'center',
  },
  gridRoot: {
    flex: 1,
  },
  gridTopRow: {
    flexDirection: 'row',
  },
  gridBottomRow: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    width: ROOM_COL_WIDTH,
    flexGrow: 0,
    flexShrink: 0,
  },
  headerScroll: {
    flex: 1,
  },
  leftColumn: {
    width: ROOM_COL_WIDTH,
    flexGrow: 0,
    flexShrink: 0,
  },
  rightColumnOuter: {
    flex: 1,
  },
  rowLabel: {
    width: ROOM_COL_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 3,
  },
  rowLabelText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.text,
  },
  rowLabelTextSmall: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.text,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    height: HEADER_ROW_HEIGHT,
    backgroundColor: colors.surface,
  },
  dateHeaderCell: {
    height: HEADER_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  dateHeaderWeekday: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  dateHeaderDate: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.text,
  },
  todayFlag: {
    position: 'absolute',
    top: -1,
    alignSelf: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: colors.navy,
  },
  selectedFlag: {
    position: 'absolute',
    top: -1,
    alignSelf: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: colors.coral,
  },
  todayFlagText: {
    fontFamily: fonts.bodyBold,
    fontSize: 7.5,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  occupancyRow: {
    flexDirection: 'row',
    height: OCCUPANCY_ROW_HEIGHT,
    backgroundColor: colors.surface,
  },
  occupancyCell: {
    height: OCCUPANCY_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
  },
  occupancyTrack: {
    width: '100%',
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.border,
  },
  occupancyBar: {
    height: 3,
    borderRadius: 1.5,
  },
  occupancyPct: {
    fontFamily: fonts.body,
    fontSize: 9.5,
    color: colors.textMuted,
  },
  categoryRowLeft: {
    height: CATEGORY_ROW_HEIGHT,
    width: ROOM_COL_WIDTH,
    backgroundColor: colors.navySoft,
  },
  categoryRowRight: {
    height: CATEGORY_ROW_HEIGHT,
    backgroundColor: colors.navySoft,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  // Renders on top of both scroll panes (see gridBottomRow's
  // position:'relative'/overflow:'hidden' and the categoryOffsets/scrollY
  // plumbing in the component) so the room-type name always has the full
  // screen width to render in, unconstrained by the narrow room-number
  // column underneath it.
  categoryOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: CATEGORY_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.navySoft,
    zIndex: 5,
    elevation: 5,
  },
  categoryOverlayName: {
    flexShrink: 1,
    minWidth: 0,
    fontFamily: fonts.headingBold,
    fontSize: 12.5,
    color: colors.navy,
  },
  categoryCount: {
    flexShrink: 0,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  categoryCountText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.navy,
  },
  roomLabelRow: {
    flexDirection: 'row',
    height: ROOM_ROW_HEIGHT,
    width: ROOM_COL_WIDTH,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 6,
  },
  roomNumber: {
    fontFamily: fonts.headingBold,
    fontSize: 14,
    color: colors.text,
  },
  roomStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dayCellsRow: {
    flexDirection: 'row',
    position: 'relative',
    height: ROOM_ROW_HEIGHT,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  dayCell: {
    height: '100%',
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  bookingBar: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    shadowColor: colors.navyInk,
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  bookingBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bookingBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
  },
  bookingDivider: {
    alignSelf: 'stretch',
    marginVertical: 6,
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  bookingTextCol: {
    flexShrink: 1,
    minWidth: 0,
  },
  bookingName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11.5,
  },
  bookingStatusLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    opacity: 0.85,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 16,
    height: 10,
    borderRadius: 2,
    borderWidth: 1,
  },
  legendLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  fab: {
    position: 'absolute',
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.navy,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  scrim: {
    backgroundColor: 'rgba(18,23,58,0.35)',
  },
  menuCard: {
    position: 'absolute',
    right: 14,
    width: 210,
    maxHeight: 400,
    backgroundColor: colors.navyInk,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  menuItem: {
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  menuItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  menuItemText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13.5,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
