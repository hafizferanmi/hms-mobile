import { apiPost } from './client';

// Mirrors hms-backend-node's Staff model (src/models/staff.js) — trimmed to
// the fields the mobile app currently reads. `password` is stripped
// server-side before the login response ever includes it.
export type Staff = {
  _id: string;
  email: string;
  name: string;
  phone?: string;
  companyId: string;
  organizationId?: string;
  role: string;
  displayImage?: string;
  disabled: boolean;
  emailVerified: boolean;
};

export type LoginResponse = {
  token: string;
  staff: Staff;
};

// POST /staffs/login (src/routes/staff.js -> businesslogic/auth.js#staffLogin
// in hms-backend-node). On a validation or credentials failure, the backend
// still replies 200 with { success: false, message } — the client.ts
// response interceptor turns that into a rejected promise with that
// message, so a wrong-password attempt surfaces here as a normal thrown
// Error, not a 4xx to special-case.
export function login(email: string, password: string) {
  return apiPost<LoginResponse>('/staffs/login', { email, password });
}
