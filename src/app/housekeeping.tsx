import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import {
  updateRoomCleanStatus,
  type CleanStatus,
  type HousekeepingRoomDto,
} from "@/api/rooms";
import {
  CLEAN_STATUS_META,
  CLEAN_STATUS_ORDER,
  inferFloor,
  roomsNeedingTurnover,
} from "@/constants/housekeeping";
import { colors, fonts } from "@/design/theme";
import { useHousekeepingRooms } from "@/hooks/use-housekeeping";
import { useReservations } from "@/hooks/use-reservations";

// -----------------------------------------------------------------------
// Housekeeping.html + RoomStatusMenu.html, per FLOW.md: tapping a room's
// status pill opens the change-status sheet; tapping a status there
// updates it and closes, back to the board. The turnover banner's room
// chips and the date button are both "not yet designed" per FLOW.md, so
// they stay inert.
//
// Two display details have no backing data at all and are inferred —
// see src/constants/housekeeping.ts's comments on inferFloor() (there's
// no `floor` field on Room) and roomsNeedingTurnover() (no explicit
// turnover flag, just a checkout-date heuristic).
//
// The 5 status count chips double as filters (tap to narrow the board to
// just that status, tap again to clear) — not explicitly in FLOW.md, but
// the same tappable-chip pattern guests.tsx's status chips already use.
// -----------------------------------------------------------------------

function formatToday() {
  return new Date().toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function BackIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.text}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function SearchIcon() {
  return (
    <Svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.textFaint}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx={11} cy={11} r={7} />
      <Path d="m21 21-4.3-4.3" />
    </Svg>
  );
}
function CalendarIcon() {
  return (
    <Svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.navy}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x={3} y={5} width={18} height={16} rx={2} />
      <Path d="M3 10h18" />
    </Svg>
  );
}
function AlertIcon({ color }: { color: string }) {
  return (
    <Svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
    >
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 8v5" strokeLinecap="round" />
      <Circle cx={12} cy={16} r={0.6} fill={color} stroke="none" />
    </Svg>
  );
}
function TurnoverDotIcon({ color }: { color: string }) {
  return (
    <Svg
      width={10}
      height={10}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.4}
    >
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 8v5" strokeLinecap="round" />
      <Circle cx={12} cy={16} r={0.5} fill={color} stroke="none" />
    </Svg>
  );
}
function ChevronDownIcon({ color }: { color: string }) {
  return (
    <Svg
      width={9}
      height={9}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}
function CloseIcon() {
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.textMuted}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function CheckIcon({ color }: { color: string }) {
  return (
    <Svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

function RoomRow({
  room,
  needsTurnover,
  onPressStatus,
}: {
  room: HousekeepingRoomDto;
  needsTurnover: boolean;
  onPressStatus: () => void;
}) {
  const meta = CLEAN_STATUS_META[room.cleanStatus];
  const floor = inferFloor(room.number);
  return (
    <View style={[styles.roomRow]}>
      <View>
        <View style={styles.roomNumberLine}>
          <Text style={styles.roomNumber}>{room.number}</Text>
          {needsTurnover && <TurnoverDotIcon color={colors.coral} />}
        </View>
        {floor !== null && <Text style={styles.roomFloor}>Floor {floor}</Text>}
      </View>

      <View style={styles.assigneeWrap}>
        <View style={styles.assigneeAvatar}>
          <Text style={styles.assigneeAvatarText}>
            {room.housekeepingAssignee
              ? getInitials(room.housekeepingAssignee.name)
              : "—"}
          </Text>
        </View>
        <Text style={styles.assigneeName} numberOfLines={1}>
          {room.housekeepingAssignee?.name ?? "Unassigned"}
        </Text>
      </View>

      <Pressable
        style={[styles.statusPill, { backgroundColor: meta.soft }]}
        onPress={onPressStatus}
      >
        <Text style={[styles.statusPillText, { color: meta.color }]}>
          {meta.label.toUpperCase()}
        </Text>
        <ChevronDownIcon color={meta.color} />
      </Pressable>
    </View>
  );
}

function RoomStatusMenu({
  room,
  pending,
  errorMessage,
  onClose,
  onSelect,
}: {
  room: HousekeepingRoomDto;
  pending: boolean;
  errorMessage?: string;
  onClose: () => void;
  onSelect: (status: CleanStatus) => void;
}) {
  return (
    <>
      <Pressable
        style={[StyleSheet.absoluteFill, styles.scrim]}
        onPress={onClose}
        accessibilityLabel="Close menu"
      />
      <View style={styles.sheetWrapper}>
        <View style={styles.sheetHeaderRow}>
          <View>
            <Text style={styles.sheetTitle}>Room {room.number}</Text>
            <Text style={styles.sheetSubtitle}>Update housekeeping status</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <CloseIcon />
          </Pressable>
        </View>

        {!!errorMessage && (
          <Text style={styles.sheetErrorText}>{errorMessage}</Text>
        )}

        <View style={styles.sheetOptions}>
          {CLEAN_STATUS_ORDER.map((status) => {
            const meta = CLEAN_STATUS_META[status];
            const active = room.cleanStatus === status;
            return (
              <Pressable
                key={status}
                style={[
                  styles.sheetOption,
                  active && {
                    borderColor: meta.color,
                    backgroundColor: meta.soft,
                  },
                ]}
                disabled={active || pending}
                onPress={() => onSelect(status)}
              >
                <View
                  style={[
                    styles.sheetOptionDot,
                    { backgroundColor: meta.color },
                  ]}
                />
                <Text
                  style={[
                    styles.sheetOptionText,
                    status === "OUT_OF_ORDER" && { color: meta.color },
                  ]}
                >
                  {meta.label}
                </Text>
                {active &&
                  (pending ? (
                    <ActivityIndicator color={meta.color} size="small" />
                  ) : (
                    <CheckIcon color={meta.color} />
                  ))}
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
}

export default function HousekeepingScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const {
    data: rooms,
    isLoading,
    isError,
    error,
    refetch: refetchRooms,
  } = useHousekeepingRooms();
  const { data: reservations, refetch: refetchReservations } =
    useReservations();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CleanStatus | null>(null);
  const [activeRoom, setActiveRoom] = useState<HousekeepingRoomDto | null>(
    null,
  );
  const [menuError, setMenuError] = useState<string | undefined>();

  const updateStatusMutation = useMutation({
    mutationFn: ({
      roomId,
      cleanStatus,
    }: {
      roomId: string;
      cleanStatus: CleanStatus;
    }) => updateRoomCleanStatus(roomId, cleanStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping-rooms"] });
      setActiveRoom(null);
      setMenuError(undefined);
    },
    onError: (err: Error) => setMenuError(err.message),
  });

  const turnoverRoomIds = useMemo(
    () => roomsNeedingTurnover(rooms ?? [], reservations ?? []),
    [rooms, reservations],
  );
  const turnoverRooms = useMemo(
    () => (rooms ?? []).filter((r) => turnoverRoomIds.has(r._id)),
    [rooms, turnoverRoomIds],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<CleanStatus, number> = {
      DIRTY: 0,
      CLEANING: 0,
      CLEAN: 0,
      INSPECTED: 0,
      OUT_OF_ORDER: 0,
    };
    for (const r of rooms ?? []) counts[r.cleanStatus] += 1;
    return counts;
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rooms ?? []).filter((r) => {
      if (statusFilter && r.cleanStatus !== statusFilter) return false;
      if (q && !r.number.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rooms, search, statusFilter]);

  const groups = useMemo(() => {
    const byType = new Map<
      string,
      { name: string; rooms: HousekeepingRoomDto[] }
    >();
    for (const r of filteredRooms) {
      const key = r.roomTypeId?._id ?? "unknown";
      const name = r.roomTypeId?.name ?? "Other";
      if (!byType.has(key)) byType.set(key, { name, rooms: [] });
      byType.get(key)!.rooms.push(r);
    }
    return Array.from(byType.values());
  }, [filteredRooms]);

  const roomTypeCount = new Set(
    (rooms ?? []).map((r) => r.roomTypeId?._id).filter(Boolean),
  ).size;

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchRooms(), refetchReservations()]);
    setRefreshing(false);
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <BackIcon />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Housekeeping</Text>
            <Text style={styles.headerSubtitle}>
              {rooms?.length ?? 0} rooms · {roomTypeCount} room types
            </Text>
          </View>
        </View>
        <View style={styles.dateButton}>
          <CalendarIcon />
          <Text style={styles.dateButtonText}>{formatToday()}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} colors={[colors.navy]} />
        }
      >
        {turnoverRooms.length > 0 && (
          <View style={styles.turnoverBanner}>
            <AlertIcon color={colors.coral} />
            <Text style={styles.turnoverText}>
              {turnoverRooms.length} rooms need turnover:
            </Text>
            {turnoverRooms.slice(0, 3).map((r) => (
              <View key={r._id} style={styles.turnoverChip}>
                <Text style={styles.turnoverChipText}>{r.number}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.searchWrap}>
          <View style={styles.searchIconWrap}>
            <SearchIcon />
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search room number"
            placeholderTextColor={colors.textFaint}
            style={styles.searchInput}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {CLEAN_STATUS_ORDER.map((status) => {
            const meta = CLEAN_STATUS_META[status];
            const active = statusFilter === status;
            return (
              <Pressable
                key={status}
                style={[
                  styles.filterChip,
                  active && {
                    backgroundColor: meta.soft,
                    borderColor: meta.color,
                  },
                ]}
                onPress={() =>
                  setStatusFilter((prev) => (prev === status ? null : status))
                }
              >
                <View
                  style={[
                    styles.filterChipDot,
                    { backgroundColor: meta.color },
                  ]}
                />
                <Text style={[styles.filterChipText, { color: meta.color }]}>
                  {meta.label} {statusCounts[status]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.groupsWrap}>
          {isLoading ? (
            <ActivityIndicator color={colors.navy} style={styles.loading} />
          ) : isError ? (
            <Text style={styles.errorText}>{error.message}</Text>
          ) : groups.length === 0 ? (
            <Text style={styles.emptyText}>No rooms found.</Text>
          ) : (
            groups.map((group) => {
              const needCleaning = group.rooms.filter(
                (r) => r.cleanStatus === "DIRTY",
              ).length;
              return (
                <View key={group.name} style={styles.group}>
                  <View style={styles.groupHeaderRow}>
                    <Text style={styles.groupTitle}>
                      {group.name}{" "}
                      <Text style={styles.groupCount}>
                        · {group.rooms.length} rooms
                      </Text>
                    </Text>
                    {needCleaning > 0 && (
                      <Text style={styles.groupNeedCleaning}>
                        {needCleaning} need cleaning
                      </Text>
                    )}
                  </View>
                  <View style={styles.groupRooms}>
                    {group.rooms.map((room) => (
                      <RoomRow
                        key={room._id}
                        room={room}
                        needsTurnover={turnoverRoomIds.has(room._id)}
                        onPressStatus={() => {
                          setMenuError(undefined);
                          setActiveRoom(room);
                        }}
                      />
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {activeRoom && (
        <RoomStatusMenu
          room={activeRoom}
          pending={updateStatusMutation.isPending}
          errorMessage={menuError}
          onClose={() => setActiveRoom(null)}
          onSelect={(status) =>
            updateStatusMutation.mutate({
              roomId: activeRoom._id,
              cleanStatus: status,
            })
          }
        />
      )}
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
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
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
  dateButton: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  dateButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    color: colors.navyInk,
  },
  body: {
    paddingBottom: 24,
  },
  turnoverBanner: {
    marginTop: 14,
    marginHorizontal: 20,
    backgroundColor: colors.coralSoft,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  turnoverText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.coral,
  },
  turnoverChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  turnoverChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.navyInk,
  },
  searchWrap: {
    marginTop: 14,
    marginHorizontal: 20,
    position: "relative",
    justifyContent: "center",
  },
  searchIconWrap: {
    position: "absolute",
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
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  filterChip: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
  },
  groupsWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  loading: {
    marginTop: 24,
  },
  errorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.danger,
    textAlign: "center",
    marginTop: 24,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 24,
  },
  group: {
    marginBottom: 22,
  },
  groupHeaderRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  groupTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 14.5,
    color: colors.navyInk,
  },
  groupCount: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textFaint,
  },
  groupNeedCleaning: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    color: colors.amber,
  },
  groupRooms: {
    marginTop: 10,
    gap: 8,
  },
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  roomNumberLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  roomNumber: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  roomFloor: {
    fontFamily: fonts.body,
    fontSize: 10.5,
    color: colors.textFaint,
    marginTop: 1,
  },
  assigneeWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minWidth: 0,
  },
  assigneeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.navySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  assigneeAvatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.navy,
  },
  assigneeName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.textMuted,
    flexShrink: 1,
  },
  statusPill: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  statusPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  scrim: {
    backgroundColor: "rgba(18,23,58,0.32)",
  },
  sheetWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 17,
    color: colors.navyInk,
  },
  sheetSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sheetErrorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.danger,
    marginBottom: 10,
    textAlign: "center",
  },
  sheetOptions: {
    gap: 8,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  sheetOptionDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  sheetOptionText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.navyInk,
  },
});
