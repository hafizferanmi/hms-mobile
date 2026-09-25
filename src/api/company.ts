import type { Staff } from './auth';
import { apiGet, apiPut } from './client';

// Mirrors hms-backend-node's Company model (src/models/company.js) —
// Settings → Property Info's read model, and Company Settings/Edit
// Policies' write payloads. There's no dedicated GET /settings endpoint
// (routes/settings.js is PUT/POST-only); GET /staffs/me is the only
// endpoint that returns the current company doc (businesslogic/
// staff.js#currentStaff returns `{ staff, company }`), same as
// hms-frontend-react's Overview.js reads `state.currentStaff.data.company`.
export type CompanyDto = {
  _id: string;
  name: string;
  logo?: string;
  email?: string;
  phone?: string;
  website?: string;
  country?: string; // ISO 3166-1 alpha-2, e.g. "NG" — see src/constants/countries.ts
  idNumber?: string;
  taxNumber?: string;
  taxRate?: number;
  taxLabel?: string;
  address?: string;
  currency?: string; // ISO 4217, e.g. "NGN"
  slogan?: string;
  // Settings → Overview's Policies card — shown to staff, not yet
  // surfaced anywhere guest-facing.
  checkInTime?: string; // "HH:mm", e.g. "14:00"
  checkOutTime?: string; // "HH:mm", e.g. "12:00"
  childFreeAge?: number | null; // null/undefined = "no free admission"
  smokingAllowed?: boolean;
  petsAllowed?: boolean;
  additionalRules?: string;
  termsAndConditions?: string;
};

export function getMyCompany() {
  return apiGet<{ staff: Staff; company: CompanyDto }>('/staffs/me');
}

export type CompanySettingsPayload = {
  name: string;
  country: string;
  currency?: string;
  address?: string;
  taxRate?: number;
  taxLabel?: string;
  email?: string;
  phone?: string;
  website?: string;
  idNumber?: string;
  taxNumber?: string;
  slogan?: string;
};

export function updateCompanySettings(payload: CompanySettingsPayload) {
  return apiPut<CompanyDto>('/settings', payload);
}

export type CompanyPoliciesPayload = {
  checkInTime: string;
  checkOutTime: string;
  childFreeAge?: number | null;
  smokingAllowed?: boolean;
  petsAllowed?: boolean;
  additionalRules?: string;
  termsAndConditions?: string;
};

export function updateCompanyPolicies(payload: CompanyPoliciesPayload) {
  return apiPut<CompanyDto>('/settings/policies', payload);
}
