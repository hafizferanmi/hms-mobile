import type { CustomFieldValue } from '@/api/custom-fields';
import type { ReservationStatus } from '@/constants/reservation';

import { apiGet, apiPost, apiPut } from './client';

// Mirrors hms-backend-node's CheckIn + Guest models (src/models/checkIn.js,
// src/models/guests.js) and businesslogic/checkIn.js, trimmed to the
// fields this app reads/writes.
//
// GET /check-ins/:id (getCheckIn) exists but is dead code: it calls
// `docToObject(CheckIn.find(...))` — `.find` returns an array, arrays have
// no `.toObject()`, so `docToObject` always falls through to `{}` and the
// response is missing every real field. hms-frontend-react imports this
// endpoint's client function once and never actually calls it (commented
// out) — nothing exercises it. Rather than depend on a broken endpoint,
// this app fetches the list (GET /check-ins, which builds its response via
// aggregation and works fine) once and looks reservations up by id from
// it — see useReservations() in src/hooks/use-reservations.ts, used by
// every screen that needs a single reservation.
export type CheckInType = 'RESERVED' | 'CHECKEDIN' | 'CHECKEDOUT' | 'CANCELED';

// Exported for guests.ts — a guest profile's `latestStatus` from
// GET /guest-profiles is the same raw CheckInType, needing the same
// RESERVED/CHECKEDIN/CHECKEDOUT -> ReservationStatus mapping as here.
export const CHECKIN_TYPE_TO_STATUS: Record<CheckInType, ReservationStatus> = {
  RESERVED: 'RESERVED',
  CHECKEDIN: 'IN_HOUSE',
  CHECKEDOUT: 'CHECKED_OUT',
  CANCELED: 'CANCELED',
};

export type GuestDto = {
  _id: string;
  hierarchy: 'PRIMARY' | 'SECONDARY' | 'VISITOR';
  title?: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
};

export type RoomDto = {
  _id: string;
  number: string;
};

export type CheckInDto = {
  _id: string;
  reservationNumber?: string;
  room: RoomDto | null;
  type: CheckInType;
  dateOfArrival: string;
  dateOfDeparture: string;
  guests: GuestDto[];
  customFieldValues?: CustomFieldValue[];
};

export type ListCheckInsResponse = {
  checkIns: CheckInDto[];
  total: number;
  arrivingToday: number;
};

// Every status, always — this app's own screens (reservations-list.tsx)
// do their status/search/date filtering client-side over the full list,
// same as they did over the old mock array. GET /check-ins otherwise
// defaults to RESERVED+CHECKEDIN only, which would silently hide
// checked-out/canceled reservations from that filtering.
const ALL_TYPES: CheckInType[] = ['RESERVED', 'CHECKEDIN', 'CHECKEDOUT', 'CANCELED'];

export function listReservations() {
  return apiGet<ListCheckInsResponse>('/check-ins', { params: { types: ALL_TYPES } });
}

export type ReservationPayload = {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfArrival: string;
  dateOfDeparture: string;
  room: string;
  customFieldValues?: CustomFieldValue[];
};

export function createReservation(payload: ReservationPayload) {
  return apiPost<{ checkIn: CheckInDto }>('/check-ins', payload);
}

export function updateReservation(checkInId: string, payload: ReservationPayload) {
  return apiPut<{ checkIn: CheckInDto }>(`/check-ins/${checkInId}`, payload);
}

// Both resolve to the updated reservation doc directly (not wrapped in
// `{ checkIn }` the way create/update are) — not that it matters here,
// since callers just invalidate the reservations list query afterward
// rather than trying to merge these responses into it.
export function checkInReservation(checkInId: string) {
  return apiPost<CheckInDto>(`/check-ins/${checkInId}/check-in`);
}

export function checkOutReservation(checkInId: string) {
  return apiPost<CheckInDto>(`/check-ins/${checkInId}/checkout`);
}

// Only valid from CHECKED_OUT (businesslogic/checkIn.js#revertCheckout
// 400s otherwise) — checks the guest back in (type becomes CHECKEDIN).
export function revertCheckoutReservation(checkInId: string) {
  return apiPost<CheckInDto>(`/check-ins/${checkInId}/revert-checkout`);
}

// Only valid from RESERVED (businesslogic/checkIn.js#cancelCheckIn 400s
// otherwise). `reason` is optional, same as the web form's textarea.
export function cancelReservation(checkInId: string, reason?: string) {
  return apiPost<CheckInDto>(`/check-ins/${checkInId}/cancel`, reason ? { reason } : undefined);
}

export type AddGuestPayload = {
  title?: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
};

// hierarchy defaults to SECONDARY server-side (see guest-schema.js) —
// exactly what an added visitor is, so it's never sent explicitly here.
export function addGuest(checkInId: string, guests: AddGuestPayload[]) {
  return apiPost<GuestDto[]>(`/check-ins/${checkInId}/guests`, { guests });
}

// The view model every reservation screen actually renders — same shape
// MockReservation used to have (minus folio/activity, which now come from
// their own per-reservation queries — see src/hooks/use-reservation-
// activity.ts — since GET /check-ins doesn't return every reservation's
// full charge/payment/log history up front).
export type Reservation = {
  id: string;
  reservationNumber: string;
  guestName: string;
  email: string;
  phone: string;
  room: string;
  roomId: string;
  arrivalDate: Date;
  departureDate: Date;
  status: ReservationStatus;
  additionalGuests: string[];
  customFieldValues: CustomFieldValue[];
};

function guestFullName(guest: GuestDto | undefined) {
  if (!guest) return '';
  return [guest.title, guest.firstName, guest.lastName].filter(Boolean).join(' ');
}

export function toReservation(dto: CheckInDto): Reservation {
  const primary = dto.guests.find((g) => g.hierarchy === 'PRIMARY') ?? dto.guests[0];
  const additionalGuests = dto.guests.filter((g) => g !== primary).map(guestFullName).filter(Boolean);

  return {
    id: dto._id,
    reservationNumber: dto.reservationNumber ?? '',
    guestName: guestFullName(primary) || 'Guest',
    email: primary?.email ?? '',
    phone: primary?.phone ?? '',
    room: dto.room?.number ?? '—',
    roomId: dto.room?._id ?? '',
    arrivalDate: new Date(dto.dateOfArrival),
    departureDate: new Date(dto.dateOfDeparture),
    status: CHECKIN_TYPE_TO_STATUS[dto.type],
    additionalGuests,
    customFieldValues: dto.customFieldValues ?? [],
  };
}
