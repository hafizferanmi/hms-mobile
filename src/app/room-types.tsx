import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { roomTypePrice, roomTypePriceRange, type RoomTypeDto } from '@/api/rooms';
import { colors, fonts, shadow } from '@/design/theme';
import { useRoomTypes } from '@/hooks/use-room-types';

// -----------------------------------------------------------------------
// RoomTypesList.html — every room type with pricing. Tapping a row opens
// room-type/[id].tsx; the floating "Add room type" button opens
// add-room-type.tsx. Per FLOW.md.
// -----------------------------------------------------------------------

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
function PlusIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function BedIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
      <Path d="M3 18h18M5 10V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4" />
    </Svg>
  );
}

function formatNaira(amount: number) {
  return `NGN ${Math.round(amount).toLocaleString('en-US')}`;
}
function formatNairaShort(amount: number) {
  if (amount >= 1000) return `${Math.round(amount / 1000)}k`;
  return `${Math.round(amount)}`;
}

function RoomTypeRow({ roomType, roomCount, onPress }: { roomType: RoomTypeDto; roomCount?: number; onPress: () => void }) {
  const range = roomTypePriceRange(roomType);
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.iconTile}>
        <BedIcon color={colors.navy} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{roomType.name}</Text>
        <Text style={styles.rowSubtitle}>
          {roomCount !== undefined ? `${roomCount} room${roomCount === 1 ? '' : 's'} · ` : ''}
          sleeps {roomType.maxNumberOfGuest ?? 1}
        </Text>
      </View>
      <View style={styles.priceCol}>
        <Text style={styles.priceValue}>
          {range ? `NGN ${formatNairaShort(range.min)}–${formatNairaShort(range.max)}` : formatNaira(roomTypePrice(roomType))}
        </Text>
        <Text style={styles.priceLabel}>{range ? 'RANGE' : 'PER NIGHT'}</Text>
      </View>
    </Pressable>
  );
}

export default function RoomTypesScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const { data: roomTypes, isLoading, isError, error, refetch, isRefetching } = useRoomTypes();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (roomTypes ?? []).filter((t) => !q || t.name.toLowerCase().includes(q));
  }, [roomTypes, search]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackIcon />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Rooms</Text>
          <Text style={styles.headerSubtitle}>
            {roomTypes?.length ?? 0} room type{roomTypes?.length === 1 ? '' : 's'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.navy} />}>
        <View style={styles.searchWrap}>
          <View style={styles.searchIconWrap}>
            <SearchIcon />
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search room types"
            placeholderTextColor={colors.textFaint}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.list}>
          {isLoading ? (
            <ActivityIndicator color={colors.navy} style={styles.loading} />
          ) : isError ? (
            <Text style={styles.errorText}>{error.message}</Text>
          ) : filtered.length === 0 ? (
            <Text style={styles.emptyText}>No room types found.</Text>
          ) : (
            filtered.map((t) => (
              <RoomTypeRow key={t._id} roomType={t} onPress={() => router.push(`/room-type/${t._id}`)} />
            ))
          )}
        </View>
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => router.push('/add-room-type')}>
        <PlusIcon />
        <Text style={styles.fabText}>Add room type</Text>
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
    paddingBottom: 120,
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
  list: {
    marginTop: 14,
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
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 13.5,
    color: colors.navyInk,
  },
  rowSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 3,
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  priceValue: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 13.5,
    color: colors.coral,
  },
  priceLabel: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.textFaint,
    marginTop: 2,
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
