import { apiDelete, apiGet, apiPost, apiPut } from './client';

// Mirrors hms-backend-node's Room + RoomType models, trimmed to what
// edit-guest.tsx's create-mode room picker, check-availability.tsx, and
// the Room Types settings screens (room-types.tsx, room-type/[id].tsx,
// add-room-type.tsx, add-room.tsx) read/write.
export type RoomTypeDto = {
  _id: string;
  name: string;
  desc?: string;
  price?: number;
  priceModel: 'FIXED' | 'FLEXIBLE';
  flexiblePrice?: { price: number }[];
  maxNumberOfGuest?: number;
};

export type AvailableRoomDto = {
  _id: string;
  number: string;
  roomTypeId: RoomTypeDto | null;
};

export type CheckAvailabilityResponse = {
  from: string;
  to: string;
  count: number;
  rooms: AvailableRoomDto[];
};

// GET /rooms/availability (businesslogic/room.js#checkAvailability) —
// real available-room search for the given date range (optionally scoped
// to one room type), used by edit-guest.tsx's create-mode room picker and
// check-availability.tsx's results.
export function checkAvailability(from: string, to: string, roomType?: string) {
  return apiGet<CheckAvailabilityResponse>('/rooms/availability', { params: { from, to, roomType } });
}

// GET /room-types — check-availability.tsx's "Room Type" filter.
export function listRoomTypes() {
  return apiGet<RoomTypeDto[]>('/room-types');
}

export function roomTypePrice(roomType: RoomTypeDto | null) {
  if (!roomType) return 0;
  if (roomType.priceModel === 'FLEXIBLE') return roomType.flexiblePrice?.[0]?.price ?? 0;
  return roomType.price ?? 0;
}

// FLEXIBLE's per-night figure is really a range across 1..maxNumberOfGuest
// guests — e.g. "NGN 60,000–110,000". No formatter for this exists
// anywhere else in the app; this is the one place it's needed
// (room-types.tsx's list row).
export function roomTypePriceRange(roomType: RoomTypeDto) {
  if (roomType.priceModel !== 'FLEXIBLE' || !roomType.flexiblePrice?.length) {
    return null;
  }
  const prices = roomType.flexiblePrice.map((p) => p.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export type RoomDto = {
  _id: string;
  number: string;
  desc?: string;
};

export type RoomTypeDetailResponse = {
  type: RoomTypeDto;
  rooms: RoomDto[];
};

export function getRoomType(roomTypeId: string) {
  return apiGet<RoomTypeDetailResponse>(`/room-types/${roomTypeId}`);
}

export type RoomTypePayload = {
  name: string;
  desc?: string;
  priceModel: 'FIXED' | 'FLEXIBLE';
  price?: number;
  flexiblePrice?: { price: number }[];
  maxNumberOfGuest?: number;
};

export function addRoomType(payload: RoomTypePayload) {
  return apiPost<RoomTypeDto>('/room-types', payload);
}

export function updateRoomType(roomTypeId: string, payload: RoomTypePayload) {
  return apiPut<RoomTypeDto>(`/room-types/${roomTypeId}`, payload);
}

// Cascades server-side — also deletes every Room under this type.
export function deleteRoomType(roomTypeId: string) {
  return apiDelete<{ deleted: boolean }>(`/room-types/${roomTypeId}`);
}

// Payload key is `roomType` (not `roomTypeId`) — hms-backend-node's
// roomSchema.js validates the field as `roomType`, then addRoom/updateRoom
// destructure `roomType: roomTypeId` before saving. The returned/stored
// doc field is `roomTypeId`, so send one name and read back the other.
export function addRoom(number: string, roomTypeId: string, desc?: string) {
  return apiPost<RoomDto>('/rooms', { number, roomType: roomTypeId, desc });
}

// roomType is required server-side even though it never actually changes
// here (add-room.tsx's edit mode keeps the room under the same room
// type) — RoomSchema validates it as required on both add and update.
export function updateRoom(roomId: string, number: string, roomTypeId: string, desc?: string) {
  return apiPut<RoomDto>(`/rooms/${roomId}`, { number, roomType: roomTypeId, desc });
}

// Refused server-side ("Room is booked. Cannot delete room.") if the
// room's current status is BOOKED.
export function deleteRoom(roomId: string) {
  return apiDelete<{ deleted: boolean }>(`/rooms/${roomId}`);
}

// Housekeeping.html's board — mirrors the rest of the Room model
// (src/models/room.js) that the other room screens don't need: its
// cleanStatus and who's assigned to clean it. GET /rooms (getAllRooms)
// already populates both roomTypeId and housekeepingAssignee down to
// {_id, name}, so the board can group by room type and show an assignee
// initials-avatar with no extra requests.
export type CleanStatus = 'DIRTY' | 'CLEANING' | 'CLEAN' | 'INSPECTED' | 'OUT_OF_ORDER';

export type HousekeepingRoomDto = {
  _id: string;
  number: string;
  cleanStatus: CleanStatus;
  roomTypeId: { _id: string; name: string } | null;
  housekeepingAssignee: { _id: string; name: string } | null;
};

export function listRoomsForHousekeeping() {
  return apiGet<HousekeepingRoomDto[]>('/rooms');
}

export function updateRoomCleanStatus(roomId: string, cleanStatus: CleanStatus) {
  return apiPut<HousekeepingRoomDto>(`/rooms/${roomId}/clean-status`, { cleanStatus });
}
