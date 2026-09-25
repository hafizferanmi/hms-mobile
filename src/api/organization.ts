import { apiGet, apiPost } from './client';

// Mirrors hms-backend-node's Organization model + businesslogic/
// organization.js — every staff account gets one lazily, on the first
// call to either endpoint below (ensureOrganization()), rather than at
// signup, so a brand-new staff's very first GET /organization/companies
// is what creates it and returns just their one current company.
export type OrganizationCompanyDto = {
  _id: string;
  name: string;
  country?: string;
  city?: string;
  estimatedRooms?: string;
  roomCount: number;
  active: boolean;
};

export type OrganizationCompaniesResponse = {
  organizationName: string | null;
  companies: OrganizationCompanyDto[];
};

export function getOrganizationCompanies() {
  return apiGet<OrganizationCompaniesResponse>('/organization/companies');
}

export type AddOrganizationCompanyPayload = {
  company: string;
  country?: string;
  city?: string;
  estimatedRooms?: string;
};

export function addOrganizationCompany(payload: AddOrganizationCompanyPayload) {
  return apiPost<OrganizationCompanyDto>('/organization/company', payload);
}

// Matches hms-frontend-react's CompanySwitcherModal.js — a fixed set of
// coarse size buckets for the "New company" form's Estimated rooms field
// (Company model's `estimatedRooms`, a free string server-side), unrelated
// to the employee-headcount COMPANY_SIZE enum used elsewhere in Settings.
export const ESTIMATED_ROOMS_OPTIONS = ['1-10', '11-30', '31-75', '75+'];
