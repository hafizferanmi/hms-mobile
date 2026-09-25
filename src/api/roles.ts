import { apiDelete, apiGet, apiPost, apiPut } from './client';

// Mirrors hms-backend-node's Role model (src/models/role.js) — a
// company-defined custom role, distinct from the fixed STAFF_ROLES enum
// (see src/api/staff.ts). `staffCount` is computed server-side on every
// read (Staff.countDocuments), not stored.
export const ROLE_MODULES = ['DASHBOARD', 'GUESTS', 'ROOMS', 'REVIEWS', 'STAFFS', 'SETTINGS'] as const;
export type RoleModule = (typeof ROLE_MODULES)[number];

export const ROLE_MODULE_LABEL: Record<RoleModule, string> = {
  DASHBOARD: 'Dashboard',
  GUESTS: 'Guests',
  ROOMS: 'Rooms',
  REVIEWS: 'Reviews',
  STAFFS: 'Staff',
  SETTINGS: 'Settings',
};

export type RolePermission = {
  module: RoleModule;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

export type RoleDto = {
  _id: string;
  name: string;
  description?: string;
  permissions: RolePermission[];
  staffCount: number;
};

export function listRoles() {
  return apiGet<RoleDto[]>('/roles');
}

export type RolePayload = {
  name: string;
  description?: string;
  permissions: RolePermission[];
};

export function addRole(payload: RolePayload) {
  return apiPost<RoleDto>('/roles', payload);
}

export function updateRole(roleId: string, payload: RolePayload) {
  return apiPut<RoleDto>(`/roles/${roleId}`, payload);
}

// Rejects (via the normal thrown-Error path — see src/api/client.ts) with
// "Cannot delete this role — N staff member(s) are still assigned to it."
// when staffCount > 0 — hms-backend-node guards this server-side rather
// than the client needing to check staffCount itself first.
export function deleteRole(roleId: string) {
  return apiDelete<{ deleted: boolean }>(`/roles/${roleId}`);
}
