import { apiDelete, apiGet, apiPost, apiPut } from './client';

// Mirrors hms-backend-node's Staff model (src/models/staff.js) trimmed to
// what these screens read/write. `role` is the required STAFF_ROLES enum
// value (access-control role) — the mockups' "DEPARTMENT" field maps to
// this, since the backend has no separate department concept. `roleId` is
// the optional *custom*, company-defined role (src/models/role.js) — the
// mockups' "ROLE" field.
export type StaffRole =
  | 'FRONT_DESK_OFFICER'
  | 'ADMINISTRATOR'
  | 'GYM_MANAGER'
  | 'GYM_STAFF'
  | 'BAR_MANAGER'
  | 'BAR_STAFF'
  | 'RESTAURANT_MANAGER'
  | 'RESTAURANT_STAFF'
  | 'BANQUET_MANAGER'
  | 'BANQUET_STAFF'
  | 'CAFE_MANAGER'
  | 'CAFE_STAFF'
  | 'GENERAL_MANAGER'
  | 'OWNER';

export const STAFF_ROLES: StaffRole[] = [
  'FRONT_DESK_OFFICER',
  'ADMINISTRATOR',
  'GYM_MANAGER',
  'GYM_STAFF',
  'BAR_MANAGER',
  'BAR_STAFF',
  'RESTAURANT_MANAGER',
  'RESTAURANT_STAFF',
  'BANQUET_MANAGER',
  'BANQUET_STAFF',
  'CAFE_MANAGER',
  'CAFE_STAFF',
  'GENERAL_MANAGER',
  'OWNER',
];

// No label map exists on the backend for these (unlike ROLE_MODULES_LABEL
// for custom roles) — "FRONT_DESK_OFFICER" -> "Front Desk Officer".
export function humanizeStaffRole(role: string) {
  return role
    .toLowerCase()
    .split('_')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}

export type StaffDto = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  roleId?: { _id: string; name: string } | null;
  disabled: boolean;
};

export type ListStaffResponse = {
  staffs: StaffDto[];
  page: number;
  totalPages: number;
};

// A single large page rather than real pagination — matches
// listReservations()'s approach; a hotel's staff list is small enough
// that this is simpler than wiring up infinite scroll for it.
export function listStaff() {
  return apiGet<ListStaffResponse>('/staffs', { params: { resultsPerPage: 200 } });
}

export type StaffPayload = {
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  roleId?: string | null;
};

// Always sends an invite email server-side (StaffInviteEmail) — there's
// no password field in this flow, the invited staff member sets their
// own via the emailed link.
export function addStaff(payload: StaffPayload) {
  return apiPost<StaffDto>('/staffs', payload);
}

export function updateStaff(staffId: string, payload: StaffPayload) {
  return apiPut<StaffDto>(`/staffs/${staffId}`, payload);
}

export function setStaffDisabled(staffId: string, disabled: boolean) {
  return apiPut<StaffDto>(`/staffs/${staffId}/disable`, { disabled });
}

export function deleteStaff(staffId: string) {
  return apiDelete<{ deleted: boolean }>(`/staffs/${staffId}`);
}
