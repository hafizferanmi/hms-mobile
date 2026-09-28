import type { CompanyDto } from './company';

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

// POST /staffs/recover-password (businesslogic/auth.js#recoverStaffPassword)
// — emails a reset link (`${FRONTEND_URL}/reset-password/:token`, a web
// URL — see reset-password.tsx's own comment on why this app's own Reset
// Password screen isn't reachable from that email yet) if the address
// matches a staff account, silently no-ops otherwise. forgot-password.tsx
// deliberately treats both outcomes the same (never surfaces this
// rejecting) so the UI can't be used to check whether an email is
// registered — same effect hms-frontend-react's ForgotPasswordFormContainer
// gets from not even checking `success` before showing its confirmation
// screen.
export function forgotPassword(email: string) {
  return apiPost<void>('/staffs/recover-password', { email });
}

export type ResetPasswordPayload = {
  token: string;
  email: string;
  password: string;
  confirmPassword: string;
};

// POST /staffs/reset-password (businesslogic/auth.js#resetPassword) — unlike
// forgot-password above, a rejection here (expired/invalid token, or
// email/token mismatch) is genuinely worth surfacing: there's no account-
// enumeration concern in telling someone their reset link stopped working.
export function resetPassword(payload: ResetPasswordPayload) {
  return apiPost<void>('/staffs/reset-password', payload);
}

export type RegisterCompanyPayload = {
  company: string;
  subdomain: string;
  manager: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type RegisterCompanyResponse = {
  company: CompanyDto;
  staff: Staff;
  token: string;
};

// POST /companies/register (routes/company.js -> businesslogic/company.js#
// registerCompany) — no auth required, this is how someone who found the
// app on their own (rather than being invited to an existing company)
// creates their own brand-new company and owner account in one step.
// Distinct from new-company.tsx's addOrganizationCompany(), which adds an
// *additional* company to an organization an already-signed-in owner is
// part of — this one creates that organization in the first place. Unlike
// login's credentials failure, a rejection here (subdomain taken, email
// already registered) is meant to be shown inline; there's no reason to
// mask it. On success the backend signs the new staff in immediately (see
// its own comment: "takes this straight into the app instead of a 'check
// your email' holding page") and returns a real session token here too —
// signup.tsx calls useSession().signIn() with it exactly like login.tsx
// does, rather than routing anywhere else first.
export function registerCompany(payload: RegisterCompanyPayload) {
  return apiPost<RegisterCompanyResponse>('/companies/register', payload);
}
