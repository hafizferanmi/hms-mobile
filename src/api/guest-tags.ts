import { apiGet, apiPost } from './client';

// Mirrors hms-backend-node's GuestTag model (src/models/guestTag.js) — a
// company-defined label (e.g. "VIP") applied to a GuestProfile (see
// guests.ts), grouped into one of 5 fixed categories for the Add/New Tag
// sheets (guest/[id].tsx). Only list + create are wired here — FLOW.md's
// guest flows never edit or delete an existing tag from this app, that
// would be a Settings-level "manage tags" screen with no mockup yet.
export type GuestTagCategory = 'STATUS' | 'PREFERENCES' | 'BOOKING' | 'OCCASION' | 'CAUTION';

export type GuestTagDto = {
  _id: string;
  name: string;
  category: GuestTagCategory;
  color?: string;
};

export function listGuestTags() {
  return apiGet<GuestTagDto[]>('/guest-tags');
}

export type AddGuestTagPayload = {
  name: string;
  category: GuestTagCategory;
  color?: string;
};

export function addGuestTag(payload: AddGuestTagPayload) {
  return apiPost<GuestTagDto>('/guest-tags', payload);
}
