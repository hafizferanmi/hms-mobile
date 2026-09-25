import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { deleteRoom, deleteRoomType, roomTypePrice, type RoomDto } from '@/api/rooms';
import { colors, fonts, radii } from '@/design/theme';
import { useRoomTypeDetail } from '@/hooks/use-room-types';

// -----------------------------------------------------------------------
// RoomTypeDetail.html — one room type's stats, pricing, and its physical
// rooms. "•••" opens RoomTypeActionsMenu.html as an in-screen overlay
// (same pattern as staff-roles.tsx's menus). "Edit room type" reuses
// add-room-type.tsx pre-filled (FLOW.md anticipates this reuse); "Add
// room" tile opens add-room.tsx. Per FLOW.md.
// -----------------------------------------------------------------------

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function MoreIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={1.8}>
      <Circle cx={5} cy={12} r={1.6} fill={colors.text} stroke="none" />
      <Circle cx={12} cy={12} r={1.6} fill={colors.text} stroke="none" />
      <Circle cx={19} cy={12} r={1.6} fill={colors.text} stroke="none" />
    </Svg>
  );
}
function BedIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
      <Path d="M3 18h18M5 10V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4" />
    </Svg>
  );
}
function PlusIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function RoomIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={2} width={16} height={20} rx={1} />
      <Path d="M9 22v-4h6v4" />
    </Svg>
  );
}

function formatNaira(amount: number) {
  return `NGN ${Math.round(amount).toLocaleString('en-US')}`;
}

function RoomTypeActionsMenu({
  name,
  pending,
  errorMessage,
  onClose,
  onEdit,
  onDelete,
}: {
  name: string;
  pending: boolean;
  errorMessage?: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close menu" />
      <View style={styles.sheetWrapper}>
        <View style={styles.sheetGroup}>
          <View style={[styles.sheetItem, styles.sheetItemDivider]}>
            <Text style={styles.sheetKicker}>{name.toUpperCase()}</Text>
          </View>
          <Pressable style={styles.sheetItem} onPress={onEdit}>
            <Text style={styles.sheetItemText}>Edit room type</Text>
          </Pressable>
        </View>
        {!!errorMessage && (
          <View style={styles.sheetGroup}>
            <View style={styles.sheetItem}>
              <Text style={styles.sheetErrorText}>{errorMessage}</Text>
            </View>
          </View>
        )}
        <View style={styles.sheetGroup}>
          <Pressable style={styles.sheetItem} onPress={onDelete} disabled={pending}>
            {pending ? <ActivityIndicator color={colors.coral} /> : <Text style={styles.sheetDestructiveText}>Delete room type</Text>}
          </Pressable>
        </View>
        <View style={styles.sheetGroup}>
          <Pressable style={styles.sheetItem} onPress={onClose}>
            <Text style={styles.sheetCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

function RoomActionsMenu({
  room,
  pending,
  errorMessage,
  onClose,
  onEdit,
  onDelete,
}: {
  room: RoomDto;
  pending: boolean;
  errorMessage?: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close menu" />
      <View style={styles.sheetWrapper}>
        <View style={styles.sheetGroup}>
          <View style={[styles.sheetItem, styles.sheetItemDivider]}>
            <Text style={styles.sheetKicker}>ROOM {room.number}</Text>
          </View>
          <Pressable style={styles.sheetItem} onPress={onEdit}>
            <Text style={styles.sheetItemText}>Edit room</Text>
          </Pressable>
        </View>
        {!!errorMessage && (
          <View style={styles.sheetGroup}>
            <View style={styles.sheetItem}>
              <Text style={styles.sheetErrorText}>{errorMessage}</Text>
            </View>
          </View>
        )}
        <View style={styles.sheetGroup}>
          <Pressable
            style={styles.sheetItem}
            disabled={pending}
            onPress={() =>
              Alert.alert('Delete room', `Delete room ${room.number}? This can't be undone.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: onDelete },
              ])
            }>
            {pending ? <ActivityIndicator color={colors.coral} /> : <Text style={styles.sheetDestructiveText}>Delete room</Text>}
          </Pressable>
        </View>
        <View style={styles.sheetGroup}>
          <Pressable style={styles.sheetItem} onPress={onClose}>
            <Text style={styles.sheetCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

export default function RoomTypeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useRoomTypeDetail(id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuError, setMenuError] = useState<string | undefined>();
  const [activeRoomMenu, setActiveRoomMenu] = useState<RoomDto | null>(null);
  const [roomMenuError, setRoomMenuError] = useState<string | undefined>();

  const deleteMutation = useMutation({
    mutationFn: () => deleteRoomType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-types'] });
      router.back();
    },
    onError: (err: Error) => setMenuError(err.message),
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (roomId: string) => deleteRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-type', id] });
      setActiveRoomMenu(null);
      setRoomMenuError(undefined);
    },
    onError: (err: Error) => setRoomMenuError(err.message),
  });

  function openRoomMenu(room: RoomDto) {
    setRoomMenuError(undefined);
    setActiveRoomMenu(room);
  }

  if (isLoading) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>{error?.message ?? 'Room type not found.'}</Text>
      </View>
    );
  }

  const { type, rooms } = data;
  const maxGuests = type.maxNumberOfGuest ?? 1;

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackIcon />
        </Pressable>
        <Pressable
          style={styles.iconButton}
          onPress={() => {
            setMenuError(undefined);
            setMenuOpen(true);
          }}
          hitSlop={8}>
          <MoreIcon />
        </Pressable>
      </View>

      <View style={styles.titleRow}>
        <View style={styles.titleIcon}>
          <BedIcon color={colors.navy} />
        </View>
        <View>
          <Text style={styles.titleName}>{type.name}</Text>
          <Text style={styles.titleSubtitle}>
            Sleeps up to {maxGuests} guest{maxGuests === 1 ? '' : 's'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <View style={[styles.statCell, styles.statCellDivider]}>
            <Text style={styles.statLabel}>ROOMS</Text>
            <Text style={styles.statValue}>{rooms.length}</Text>
          </View>
          <View style={[styles.statCell, styles.statCellDivider]}>
            <Text style={styles.statLabel}>SLEEPS UP TO</Text>
            <Text style={[styles.statValue, styles.statValueSmall]}>
              {maxGuests} guest{maxGuests === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>PRICING</Text>
            <Text style={styles.statValue}>{type.priceModel === 'FIXED' ? 'Fixed' : 'Flexible'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PRICING</Text>
          <View style={styles.priceCard}>
            <Text style={styles.priceValue}>{formatNaira(roomTypePrice(type))}</Text>
            <Text style={styles.priceUnit}>/ night</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ROOMS OF THIS TYPE ({rooms.length})</Text>
          <View style={styles.grid}>
            <Pressable
              style={[styles.gridTile, styles.addTile]}
              onPress={() => router.push(`/add-room?roomTypeId=${id}`)}>
              <PlusIcon />
              <Text style={styles.addTileText}>Add room</Text>
            </Pressable>
            {rooms.map((room: RoomDto) => (
              <Pressable key={room._id} style={styles.gridTile} onPress={() => openRoomMenu(room)}>
                <RoomIcon />
                <Text style={styles.roomNumber}>{room.number}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {menuOpen && (
        <RoomTypeActionsMenu
          name={type.name}
          pending={deleteMutation.isPending}
          errorMessage={menuError}
          onClose={() => setMenuOpen(false)}
          onEdit={() => {
            setMenuOpen(false);
            router.push(`/add-room-type?id=${id}`);
          }}
          onDelete={() => deleteMutation.mutate()}
        />
      )}

      {activeRoomMenu && (
        <RoomActionsMenu
          room={activeRoomMenu}
          pending={deleteRoomMutation.isPending}
          errorMessage={roomMenuError}
          onClose={() => setActiveRoomMenu(null)}
          onEdit={() => {
            const roomId = activeRoomMenu._id;
            setActiveRoomMenu(null);
            router.push(`/add-room?roomTypeId=${id}&id=${roomId}`);
          }}
          onDelete={() => deleteRoomMutation.mutate(activeRoomMenu._id)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
  },
  notFoundText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  headerRow: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleName: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 19,
    color: colors.navyInk,
  },
  titleSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCell: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statCellDivider: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  statLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  statValue: {
    marginTop: 4,
    fontFamily: fonts.headingBold,
    fontSize: 14.5,
    color: colors.navyInk,
  },
  statValueSmall: {
    fontSize: 13,
  },
  section: {
    marginTop: 24,
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textFaint,
    letterSpacing: 0.6,
  },
  priceCard: {
    marginTop: 10,
    backgroundColor: colors.coralSoft,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceValue: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 20,
    color: colors.coral,
  },
  priceUnit: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  grid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridTile: {
    width: '47%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addTile: {
    borderStyle: 'dashed',
    borderWidth: 1.4,
  },
  addTileText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.navy,
  },
  roomNumber: {
    fontFamily: fonts.headingBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  scrim: {
    backgroundColor: 'rgba(18,23,58,0.32)',
  },
  sheetWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    gap: 8,
  },
  sheetGroup: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  sheetItem: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  sheetItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetKicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textFaint,
  },
  sheetItemText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.navyInk,
  },
  sheetErrorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.danger,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  sheetDestructiveText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.coral,
  },
  sheetCloseText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.navyInk,
  },
});
