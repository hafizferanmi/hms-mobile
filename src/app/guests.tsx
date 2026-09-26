import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import type { GuestProfileDto } from '@/api/guests';
import { CHECKIN_TYPE_TO_STATUS } from '@/api/reservations';
import { colors, fonts, shadow } from '@/design/theme';
import { GUEST_TAG_CATEGORY_META } from '@/constants/guest-tags';
import { RESERVATION_STATUS_META, type ReservationStatus } from '@/constants/reservation';
import { useGuestProfiles } from '@/hooks/use-guest-profiles';
import { useReservations } from '@/hooks/use-reservations';

// -----------------------------------------------------------------------
// GuestList.html — search + status/tag filter chips over every guest
// profile in the company (GET /guest-profiles, fetched in full and
// filtered client-side, same split as staff-roles.tsx). The "Tags" chip
// and "New guest" FAB are inert: there's no tag-picker mockup for
// filtering by a specific tag, and no POST /guest-profiles endpoint at
// all — a profile is only ever created behind the scenes when a
// reservation's guest is saved (findOrCreateGuestProfile in
// hms-backend-node), so there's nothing for "New guest" to call yet.
// -----------------------------------------------------------------------

const STATUS_FILTERS: { key: ReservationStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'IN_HOUSE', label: 'In House' },
  { key: 'RESERVED', label: 'Reserved' },
  { key: 'CHECKED_OUT', label: 'Checked Out' },
];

function formatNaira(amount: number) {
  return `NGN ${Math.round(amount).toLocaleString('en-US')}`;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function guestName(g: GuestProfileDto) {
  return [g.firstName, g.lastName].filter(Boolean).join(' ') || 'Unnamed guest';
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={11} cy={11} r={7} />
      <Path d="m21 21-4.3-4.3" />
    </Svg>
  );
}
function TagIcon({ color }: { color: string }) {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20.6 12.7 12.7 20.6a2 2 0 0 1-2.8 0l-8.5-8.5A2 2 0 0 1 1 10.7V4a2 2 0 0 1 2-2h6.7a2 2 0 0 1 1.4.6l9.5 9.5a2 2 0 0 1 0 2.6z" />
      <Circle cx={6.5} cy={6.5} r={1} fill={color} stroke="none" />
    </Svg>
  );
}
function PlusIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

function GuestRow({ guest, onPress }: { guest: GuestProfileDto; onPress: () => void }) {
  const status = guest.latestStatus ? CHECKIN_TYPE_TO_STATUS[guest.latestStatus] : null;
  const statusMeta = status ? RESERVATION_STATUS_META[status] : null;
  const hasCaution = guest.tags.some((t) => t.category === 'CAUTION');
  const accentColor = status === 'IN_HOUSE' ? colors.success : hasCaution ? colors.coral : undefined;

  return (
    <Pressable style={[styles.row, accentColor && { borderLeftColor: accentColor }]} onPress={onPress}>
      <View style={[styles.avatar, status === 'IN_HOUSE' && styles.avatarRinged]}>
        <Text style={styles.avatarText}>{getInitials(guestName(guest))}</Text>
      </View>
      <View style={styles.rowText}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowName} numberOfLines={1}>
            {guestName(guest)}
          </Text>
          {statusMeta && (
            <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusMeta.text }]}>{statusMeta.label.toUpperCase()}</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowContact} numberOfLines={1}>
          {guest.email || guest.phone || '—'}
        </Text>
        {guest.tags.length > 0 && (
          <View style={styles.tagRow}>
            {guest.tags.map((tag) => {
              const meta = GUEST_TAG_CATEGORY_META[tag.category];
              return (
                <View key={tag._id} style={[styles.tagPill, { backgroundColor: meta.soft }]}>
                  <Text style={[styles.tagPillText, { color: meta.color }]}>{tag.name}</Text>
                </View>
              );
            })}
          </View>
        )}
        <View style={styles.statsRow}>
          <Text style={styles.spendText}>{formatNaira(guest.totalSpend)}</Text>
          <Text style={styles.staysText}>
            {guest.stayCount} stay{guest.stayCount === 1 ? '' : 's'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function GuestListScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'ALL'>('ALL');

  const { data, isLoading, isError, error, refetch: refetchGuests } = useGuestProfiles();
  const { data: reservations, refetch: refetchReservations } = useReservations();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchGuests(), refetchReservations()]);
    setRefreshing(false);
  }

  const arrivingToday = useMemo(() => {
    if (!reservations) return 0;
    const today = new Date();
    return reservations.filter(
      (r) => (r.status === 'RESERVED' || r.status === 'IN_HOUSE') && isSameDay(r.arrivalDate, today),
    ).length;
  }, [reservations]);

  const filteredGuests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.profiles ?? []).filter((g) => {
      const status = g.latestStatus ? CHECKIN_TYPE_TO_STATUS[g.latestStatus] : null;
      if (statusFilter !== 'ALL' && status !== statusFilter) return false;
      if (!q) return true;
      return (
        guestName(g).toLowerCase().includes(q) ||
        (g.email ?? '').toLowerCase().includes(q) ||
        (g.phone ?? '').toLowerCase().includes(q)
      );
    });
  }, [data, search, statusFilter]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackIcon />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Guest list</Text>
          <Text style={styles.headerSubtitle}>
            {data?.total ?? 0} guest{data?.total === 1 ? '' : 's'} · {arrivingToday} arriving today
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} colors={[colors.navy]} />
        }>
        <View style={styles.searchWrap}>
          <View style={styles.searchIconWrap}>
            <SearchIcon />
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, email, phone"
            placeholderTextColor={colors.textFaint}
            style={styles.searchInput}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {STATUS_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
              onPress={() => setStatusFilter(f.key)}>
              <Text style={[styles.filterChipText, statusFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
          <View style={styles.filterDivider} />
          {/* TODO(filter): no tag-picker mockup exists for filtering the
              list by a specific tag, so this stays inert. */}
          <Pressable style={styles.tagFilterChip}>
            <TagIcon color={colors.navy} />
            <Text style={styles.tagFilterChipText}>Tags</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.list}>
          {isLoading ? (
            <ActivityIndicator color={colors.navy} style={styles.loading} />
          ) : isError ? (
            <Text style={styles.errorText}>{error.message}</Text>
          ) : filteredGuests.length === 0 ? (
            <Text style={styles.emptyText}>No guests found.</Text>
          ) : (
            filteredGuests.map((g) => (
              <GuestRow key={g._id} guest={g} onPress={() => router.push(`/guest/${g._id}`)} />
            ))
          )}
        </View>
      </ScrollView>

      {/* TODO(nav): no POST /guest-profiles endpoint exists — a profile is
          only ever created behind a reservation's guest, so this has
          nothing to call yet. */}
      <Pressable style={[styles.fab, { bottom: insets.bottom + 24 }]}>
        <PlusIcon />
        <Text style={styles.fabText}>New guest</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 18,
    color: colors.navyInk,
  },
  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  body: {
    paddingBottom: 100,
  },
  searchWrap: {
    marginTop: 16,
    marginHorizontal: 20,
    position: 'relative',
    justifyContent: 'center',
  },
  searchIconWrap: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  searchInput: {
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.surface,
    paddingLeft: 34,
    paddingRight: 12,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  filterChip: {
    flexShrink: 0,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.navyInk,
    borderColor: colors.navyInk,
  },
  filterChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 6,
    backgroundColor: colors.border,
  },
  tagFilterChip: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagFilterChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.navyInk,
  },
  list: {
    marginTop: 16,
    marginHorizontal: 20,
    gap: 10,
  },
  loading: {
    marginTop: 24,
  },
  errorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 24,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    paddingLeft: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderLeftWidth: 3.5,
    borderLeftColor: 'transparent',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarRinged: {
    borderColor: colors.success,
  },
  avatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.navy,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowName: {
    flexShrink: 1,
    fontFamily: fonts.headingBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  statusBadge: {
    flexShrink: 0,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  statusBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
  },
  rowContact: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 6,
  },
  tagPill: {
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  tagPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
  },
  spendText: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 12.5,
    color: colors.navyInk,
  },
  staysText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  fab: {
    position: 'absolute',
    right: 18,
    height: 52,
    paddingLeft: 18,
    paddingRight: 20,
    borderRadius: 26,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...shadow.button,
  },
  fabText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
});
