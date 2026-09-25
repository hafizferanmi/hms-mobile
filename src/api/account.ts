import type { Staff } from './auth';
import { apiPost, apiPut } from './client';

// The current staff member's own profile — hms-backend-node's PUT/POST
// /staffs/me & /staffs/change-password (routes/staff.js), distinct from
// src/api/staff.ts's admin-only staff MANAGEMENT endpoints
// (/staffs/:staffId — list/add/update/disable/delete OTHER staff).
// Mirrors hms-frontend-react's AccountPage (PersonalInfoCard.js/
// PasswordCard.js) — two independent forms/submissions, same here.

export type UpdateProfilePayload = {
  name: string;
  email: string;
  phone?: string;
};

// Only ever accepts name/email/phone (UpdateProfileSchema) — there's no
// role field here (or on a crafted request to it) for this to change, so
// role/permission changes stay under Staff & Roles.
export function updateMyProfile(payload: UpdateProfilePayload) {
  return apiPut<Staff>('/staffs/me', payload);
}

export type ChangePasswordPayload = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function changeMyPassword(payload: ChangePasswordPayload) {
  return apiPost<{ passwordUpdated: boolean }>('/staffs/change-password', payload);
}

// Moves this staff member to a different company within their own
// organization (businesslogic/staff.js#switchCompany 400s on any other
// company id). The JWT itself only encodes the staff id, not companyId
// (see currentStaff middleware), so no new token is needed — callers just
// need to re-persist the returned Staff and refetch everything
// company-scoped, same as the web app's full page reload after switching.
export function switchMyCompany(companyId: string) {
  return apiPut<Staff>('/staffs/me/switch-company', { companyId });
}
