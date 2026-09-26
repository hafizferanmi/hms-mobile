import { colors } from '@/design/theme';

import type { CleanStatus, HousekeepingRoomDto } from '@/api/rooms';
import type { Reservation } from '@/api/reservations';

// Housekeeping.html/RoomStatusMenu.html's exact display order — not the
// same as the backend's own DIRTY->CLEANING->CLEAN->INSPECTED progression
// (ROOM_CLEAN_STATUS_ORDER in hms-backend-node/src/constants/room.js),
// since this is a selection menu, not a progress indicator. OUT_OF_ORDER
// is its own terminal state, not part of that progression either way.
export const CLEAN_STATUS_ORDER: CleanStatus[] = ['DIRTY', 'CLEANING', 'INSPECTED', 'CLEAN', 'OUT_OF_ORDER'];

export const CLEAN_STATUS_META: Record<CleanStatus, { label: string; color: string; soft: string }> = {
  DIRTY: { label: 'Dirty', color: colors.amber, soft: colors.amberSoft },
  CLEANING: { label: 'In Progress', color: colors.navyInk, soft: colors.navySoft },
  CLEAN: { label: 'Clean', color: colors.success, soft: colors.successSoft },
  INSPECTED: { label: 'Inspected', color: colors.purple, soft: colors.purpleSoft },
  OUT_OF_ORDER: { label: 'Out of Order', color: colors.coral, soft: colors.coralSoft },
};

// The Room model has no `floor` field at all — this infers one from the
// room number using the near-universal hotel convention (all digits but
// the last two are the floor, e.g. "301" -> 3, "1203" -> 12), same as the
// design's own example numbers. Purely a display heuristic: it can be
// wrong for irregular numbering (annexes, named rooms, etc.), and there's
// no real data to fall back on when it is.
export function inferFloor(roomNumber: string): number | null {
  const digits = roomNumber.match(/^\d+/)?.[0];
  if (!digits) return null;
  if (digits.length <= 2) return 1;
  return Number(digits.slice(0, digits.length - 2));
}

// Also inferred, not a real backend flag: a room "needs turnover" when
// it's still DIRTY or CLEANING (hasn't been made up yet) and its most
// recent stay already checked out, with a departure date of today or
// earlier — i.e. housekeeping is behind on a room that's actually ready
// to be re-let. Returns the set of room ids currently in that state.
export function roomsNeedingTurnover(
  rooms: HousekeepingRoomDto[],
  reservations: Reservation[],
): Set<string> {
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const uncleanedRoomIds = new Set(
    rooms.filter((r) => r.cleanStatus === 'DIRTY' || r.cleanStatus === 'CLEANING').map((r) => r._id),
  );

  const needsTurnover = new Set<string>();
  for (const reservation of reservations) {
    if (reservation.status !== 'CHECKED_OUT') continue;
    if (!uncleanedRoomIds.has(reservation.roomId)) continue;
    if (reservation.departureDate.getTime() <= todayEnd.getTime()) {
      needsTurnover.add(reservation.roomId);
    }
  }
  return needsTurnover;
}
