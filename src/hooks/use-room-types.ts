import { useQuery } from '@tanstack/react-query';

import { getRoomType, listRoomTypes } from '@/api/rooms';

// room-types.tsx's list — matches listRoomTypes() already used by
// check-availability.tsx/edit-guest.tsx, just under its own query key so
// a room-type add/edit/delete here invalidates ['room-types'] without
// also having to know about (or accidentally invalidate) those unrelated
// screens' usage.
export function useRoomTypes() {
  return useQuery({
    queryKey: ['room-types'],
    queryFn: listRoomTypes,
  });
}

// room-type/[id].tsx's detail screen — GET /room-types/:id returns both
// the type doc and its physical rooms in one call (see getRoomType in
// src/api/rooms.ts), which the list endpoint doesn't include.
export function useRoomTypeDetail(roomTypeId: string) {
  return useQuery({
    queryKey: ['room-type', roomTypeId],
    queryFn: () => getRoomType(roomTypeId),
    enabled: !!roomTypeId,
  });
}
