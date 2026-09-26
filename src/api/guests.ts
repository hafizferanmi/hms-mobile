import type { CheckInType } from './reservations';
import type { GuestTagDto } from './guest-tags';
import { apiGet, apiPut } from './client';

// Mirrors hms-backend-node's GuestProfile model (src/models/guestProfile.js)
// — a guest as a *person*, independent of any one stay, distinct from the
// per-reservation Guest record reservations.ts deals with. `stayCount`/
// `totalSpend`/`latestStatus` aren't stored fields — businesslogic/
// guestProfile.js computes them from this profile's real check-ins
// (excluding canceled ones) so the guest list can show them without a
// separate request per row.
export type GuestProfileDto = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags: GuestTagDto[];
  note?: string;
  stayCount: number;
  totalSpend: number;
  latestStatus: CheckInType | null;
};

export type ListGuestProfilesResponse = {
  profiles: GuestProfileDto[];
  total: number;
  page: number;
  totalPages: number;
};

// resultsPerPage: 500 (the backend's own cap) — search and status
// filtering both happen client-side over the full list (guests.tsx),
// same as staff.ts's own listStaff(): a hotel's guest roster is small
// enough for this to be fine, and there's no status filter on the
// endpoint itself to push that work server-side anyway.
export function listGuestProfiles() {
  return apiGet<ListGuestProfilesResponse>('/guest-profiles', { params: { resultsPerPage: 500 } });
}

export type GuestStayDto = {
  _id: string;
  reservationNumber?: string;
  room: { _id: string; number: string; roomTypeId: { _id: string; name: string } | null } | null;
  type: CheckInType;
  dateOfArrival: string;
  dateOfDeparture?: string;
  rate?: { amount?: number };
};

export type GuestProfileDetailDto = GuestProfileDto & {
  stays: GuestStayDto[];
};

export function getGuestProfileDetail(guestProfileId: string) {
  return apiGet<GuestProfileDetailDto>(`/guest-profiles/${guestProfileId}`);
}

// Only tags are ever written from this app — see guest-tags.ts's header
// comment for why name/email/phone/note aren't editable here.
export function updateGuestProfileTags(guestProfileId: string, tagIds: string[]) {
  return apiPut<GuestProfileDto>(`/guest-profiles/${guestProfileId}`, { tags: tagIds });
}
