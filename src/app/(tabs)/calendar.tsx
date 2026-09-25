import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { colors, fonts } from '@/design/theme';

// -----------------------------------------------------------------------
// This screen is the mobile port of hms-frontend-react's CalendarPage (see
// src/components/CalendarPage/*.js there): the room x date grid, per-room
// housekeeping status, per-date occupancy bar, and the Reserved/In House/
// Checked Out status legend are all modeled on that real feature, not just
// design/design-reference/Calendar.html's simpler static mockup. Two
// deliberate simplifications versus the desktop version:
//   - No horizontal scroll: a fixed 5-day window (like Calendar.html) fills
//     the screen width, and paging is done by tapping a day to re-center on
//     it, rather than desktop's arbitrary-width scrolling timeline.
//   - Booking bars are plain rounded cards with a colored left accent
//     (already how Calendar.html's own mockup draws them) instead of
//     desktop's slanted "keycard" shape, since RN has no cheap clip-path.
// All data below is mocked pending the real GET /rooms/overview and
// GET /check-ins wiring — see the TODO(data) below.
// -----------------------------------------------------------------------

const ROOM_COL_WIDTH = 56;
const HEADER_ROW_HEIGHT = 54;
const OCCUPANCY_ROW_HEIGHT = 44;
const CATEGORY_ROW_HEIGHT = 32;
const ROOM_ROW_HEIGHT = 56;
const SCREEN_PADDING = 16;
const DAYS_VISIBLE = 5;
const BAR_GAP = 3;

type CleanStatus = 'DIRTY' | 'CLEANING' | 'CLEAN' | 'INSPECTED';
type BookingStatus = 'reserved' | 'in-house' | 'checked-out';

// Mirrors constants/room.js's ROOM_CLEAN_STATUS_LABEL in hms-frontend-react.
const CLEAN_STATUS_LABEL: Record<CleanStatus, string> = {
  DIRTY: 'Dirty',
  CLEANING: 'In progress',
  CLEAN: 'Clean',
  INSPECTED: 'Inspected',
};

// Mirrors CalendarPage/statusStyles.js's getStatusPalette, using our design
// tokens in place of the CMS's MUI theme palette.
const STATUS_PALETTE: Record<BookingStatus, { bg: string; border: string; text: string }> = {
  reserved: { bg: colors.navySoft, border: colors.navy, text: colors.navy },
  'in-house': { bg: colors.successSoft, border: colors.success, text: colors.success },
  'checked-out': { bg: colors.slateSoft, border: colors.slate, text: colors.slate },
};

const LEGEND_ITEMS: { status: BookingStatus; label: string }[] = [
  { status: 'reserved', label: 'Reserved' },
  { status: 'in-house', label: 'In House' },
  { status: 'checked-out', label: 'Checked Out' },
];

type MockRoom = { id: string; number: string; cleanStatus: CleanStatus };
type MockCategory = { id: string; name: string; rooms: MockRoom[] };

// TODO(data): rooms/categories mirror the screenshot's CD/JD example
// exactly, but should come from GET /rooms/overview (room types + rooms)
// once the mobile app talks to hms-backend-node.
const ROOM_CATEGORIES: MockCategory[] = [
  {
    id: 'cd',
    name: 'CD',
    rooms: [
      { id: '120', number: '120', cleanStatus: 'CLEAN' },
      { id: '121', number: '121', cleanStatus: 'INSPECTED' },
      { id: '122', number: '122', cleanStatus: 'DIRTY' },
    ],
  },
  {
    id: 'jd',
    name: 'JD',
    rooms: [
      { id: '101', number: '101', cleanStatus: 'CLEAN' },
      { id: '102', number: '102', cleanStatus: 'INSPECTED' },
      { id: '103', number: '103', cleanStatus: 'CLEAN' },
      { id: '104', number: '104', cleanStatus: 'DIRTY' },
    ],
  },
];

type MockBooking = {
  id: string;
  roomId: string;
  guestName: string;
  statusType: BookingStatus;
  // Relative to today, so the mock data stays meaningful wherever the
  // 5-day window is currently centered — mirrors buildTimelineBookings'
  // real arrival/departure dates in spirit, not literal values.
  startOffsetDays: number;
  nights: number;
};

// TODO(data): sourced from GET /check-ins once wired up — see
// CalendarPage/data/adapters.js's buildTimelineBookings in hms-frontend-react.
const MOCK_BOOKINGS: MockBooking[] = [
  { id: 'b1', roomId: '120', guestName: 'Bola Bello', statusType: 'reserved', startOffsetDays: -2, nights: 1 },
  { id: 'b2', roomId: '122', guestName: 'Maria Adeyemi', statusType: 'checked-out', startOffsetDays: -2, nights: 1 },
  { id: 'b3', roomId: '101', guestName: 'Lawal Baki', statusType: 'in-house', startOffsetDays: 0, nights: 2 },
  { id: 'b4', roomId: '103', guestName: 'Amaka Obi', statusType: 'reserved', startOffsetDays: 1, nights: 1 },
];

type CalendarDate = {
  dateObj: Date;
  day: string;
  date: number;
  month: string;
  isToday: boolean;
  isFocus: boolean;
};

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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
      isFocus: i === 0,
    });
  }
  return dates;
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

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const [centerDate, setCenterDate] = useState(() => new Date());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);

  const dates = useMemo(() => buildDateWindow(centerDate, 2, 2), [centerDate]);

  const colWidth = (windowWidth - SCREEN_PADDING * 2 - ROOM_COL_WIDTH) / DAYS_VISIBLE;

  const totalRooms = useMemo(
    () => ROOM_CATEGORIES.reduce((n, cat) => n + cat.rooms.length, 0),
    [],
  );

  const bookingsByRoom = useMemo(() => {
    const map: Record<string, { id: string; guestName: string; statusType: BookingStatus; startCol: number; span: number }[]> = {};
    MOCK_BOOKINGS.forEach((b) => {
      const arrival = startOfDay(new Date());
      arrival.setDate(arrival.getDate() + b.startOffsetDays);
      const startCol = dates.findIndex((d) => isSameDay(d.dateObj, arrival));
      if (startCol === -1) return; // outside the visible window
      const span = Math.max(1, Math.min(b.nights, dates.length - startCol));
      if (!map[b.roomId]) map[b.roomId] = [];
      map[b.roomId].push({ id: b.id, guestName: b.guestName, statusType: b.statusType, startCol, span });
    });
    return map;
  }, [dates]);

  const occupancy = useMemo(
    () =>
      dates.map((d) => {
        const occupiedRoomIds = new Set<string>();
        MOCK_BOOKINGS.forEach((b) => {
          const arrival = startOfDay(new Date());
          arrival.setDate(arrival.getDate() + b.startOffsetDays);
          const departure = new Date(arrival);
          departure.setDate(departure.getDate() + b.nights);
          if (arrival <= d.dateObj && departure > d.dateObj) occupiedRoomIds.add(b.roomId);
        });
        return Math.round((occupiedRoomIds.size / totalRooms) * 100);
      }),
    [dates, totalRooms],
  );

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
        {/* TODO(data): would re-fetch rooms/check-ins from the backend. */}
        <Pressable hitSlop={8} accessibilityLabel="Refresh">
          <RefreshIcon />
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

      <View style={styles.dayStrip}>
        <Pressable style={styles.jumpPill} onPress={() => setCenterDate(new Date())}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M3 10h18M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
          </Svg>
          <Text style={styles.jumpPillText}>
            {centerDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
          </Text>
        </Pressable>
        {dates.map((d, i) => (
          <Pressable
            key={i}
            style={[styles.dayStripCell, d.isFocus && styles.dayStripCellFocus]}
            onPress={() => setCenterDate(d.dateObj)}>
            <Text style={[styles.dayStripWeekday, d.isFocus && styles.dayStripWeekdayFocus]}>
              {d.isFocus ? 'Today' : d.day}
            </Text>
            <Text style={[styles.dayStripDate, d.isFocus && styles.dayStripDateFocus]}>{d.date}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.gridBorderTop} />

      <ScrollView style={styles.grid} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <View style={[styles.rowLabel, { height: HEADER_ROW_HEIGHT }]}>
            <Text style={styles.rowLabelText}>Rooms</Text>
          </View>
          {dates.map((d, i) => (
            <View key={i} style={[styles.dateHeaderCell, { width: colWidth }]}>
              <Text style={styles.dateHeaderWeekday}>{d.day}</Text>
              <Text style={styles.dateHeaderDate}>{d.date}</Text>
            </View>
          ))}
        </View>

        <View style={styles.occupancyRow}>
          <View style={[styles.rowLabel, { height: OCCUPANCY_ROW_HEIGHT }]}>
            <Text style={styles.rowLabelTextSmall}>Occupancy</Text>
          </View>
          {occupancy.map((pct, i) => (
            <View key={i} style={[styles.occupancyCell, { width: colWidth }]}>
              <View style={styles.occupancyTrack}>
                <View style={[styles.occupancyBar, { width: `${pct}%`, backgroundColor: getHeatColor(pct) }]} />
              </View>
              <Text style={styles.occupancyPct}>{pct}%</Text>
            </View>
          ))}
        </View>

        {ROOM_CATEGORIES.map((cat) => {
          const isCollapsed = collapsed.has(cat.id);
          return (
            <View key={cat.id}>
              <Pressable style={styles.categoryRow} onPress={() => toggleCategory(cat.id)}>
                <ChevronIcon expanded={!isCollapsed} />
                <Text style={styles.categoryName}>{cat.name}</Text>
                <View style={styles.categoryCount}>
                  <Text style={styles.categoryCountText}>{cat.rooms.length}</Text>
                </View>
              </Pressable>

              {!isCollapsed &&
                cat.rooms.map((room) => {
                  const roomBookings = bookingsByRoom[room.id] ?? [];
                  return (
                    <View key={room.id} style={styles.roomRow}>
                      <View style={styles.rowLabel}>
                        <Text style={styles.roomNumber}>{room.number}</Text>
                        <View style={styles.roomStatusRow}>
                          <View
                            style={[
                              styles.roomStatusDot,
                              { backgroundColor: room.cleanStatus === 'DIRTY' ? colors.danger : colors.success },
                            ]}
                          />
                          <Text
                            style={[
                              styles.roomStatusLabel,
                              { color: room.cleanStatus === 'DIRTY' ? colors.danger : colors.success },
                            ]}>
                            {CLEAN_STATUS_LABEL[room.cleanStatus]}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.dayCellsRow}>
                        {dates.map((_, i) => (
                          <View key={i} style={[styles.dayCell, { width: colWidth }]} />
                        ))}

                        {roomBookings.map((booking) => {
                          const palette = STATUS_PALETTE[booking.statusType];
                          const barWidth = booking.span * colWidth - BAR_GAP * 2;
                          const showText = barWidth > 90;
                          return (
                            <Pressable
                              key={booking.id}
                              style={[
                                styles.bookingBar,
                                {
                                  left: booking.startCol * colWidth + BAR_GAP,
                                  width: barWidth,
                                  backgroundColor: palette.bg,
                                  borderLeftColor: palette.border,
                                },
                              ]}>
                              <View style={[styles.bookingBadge, { borderColor: palette.border }]}>
                                <Text style={[styles.bookingBadgeText, { color: palette.text }]}>
                                  {getInitials(booking.guestName)}
                                </Text>
                              </View>
                              {showText && (
                                <View style={styles.bookingTextCol}>
                                  <Text style={[styles.bookingName, { color: palette.text }]} numberOfLines={1}>
                                    {booking.guestName}
                                  </Text>
                                </View>
                              )}
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.legend}>
        {LEGEND_ITEMS.map((item) => {
          const palette = STATUS_PALETTE[item.status];
          return (
            <View key={item.status} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: palette.bg, borderColor: palette.border }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
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
  dayStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 10,
  },
  jumpPill: {
    width: 50,
    borderRadius: 11,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  jumpPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  dayStripCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 9,
    paddingVertical: 3,
  },
  dayStripCellFocus: {
    backgroundColor: colors.navySoft,
  },
  dayStripWeekday: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  dayStripWeekdayFocus: {
    fontFamily: fonts.bodyBold,
    color: colors.navy,
  },
  dayStripDate: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.text,
  },
  dayStripDateFocus: {
    fontFamily: fonts.headingExtraBold,
    color: colors.navy,
  },
  gridBorderTop: {
    height: 1,
    backgroundColor: colors.border,
  },
  grid: {
    flex: 1,
    paddingHorizontal: SCREEN_PADDING,
  },
  headerRow: {
    flexDirection: 'row',
  },
  rowLabel: {
    width: ROOM_COL_WIDTH,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
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
  occupancyRow: {
    flexDirection: 'row',
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
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: CATEGORY_ROW_HEIGHT,
    paddingHorizontal: 4,
    backgroundColor: colors.navySoft,
  },
  categoryName: {
    fontFamily: fonts.headingBold,
    fontSize: 12.5,
    color: colors.navy,
  },
  categoryCount: {
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
  roomRow: {
    flexDirection: 'row',
    height: ROOM_ROW_HEIGHT,
  },
  roomNumber: {
    fontFamily: fonts.headingBold,
    fontSize: 14,
    color: colors.text,
  },
  roomStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roomStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roomStatusLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  dayCellsRow: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  dayCell: {
    height: '100%',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  bookingBar: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: 8,
    borderLeftWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  bookingBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
  bookingTextCol: {
    flexShrink: 1,
  },
  bookingName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11.5,
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
