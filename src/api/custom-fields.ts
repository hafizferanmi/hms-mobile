import { apiDelete, apiGet, apiPost, apiPut } from './client';

// Mirrors hms-backend-node's CustomField model (src/models/customField.js)
// — a company-defined question added to the staff-facing reservation form
// or the public guest review form. Settings → Custom fields
// (custom-fields.tsx/add-custom-field.tsx) manages both forms' field
// *definitions* here; only the RESERVATION form's fields are actually
// rendered/answered anywhere in this app (edit-guest.tsx) — REVIEW's
// fields can be defined and managed, but nothing yet collects guest
// review answers to them (no guest-facing review flow exists in this app).
export type CustomFieldForm = 'RESERVATION' | 'REVIEW';

export type CustomFieldType =
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'YES_NO';

export type CustomFieldDto = {
  _id: string;
  form: CustomFieldForm;
  label: string;
  type: CustomFieldType;
  options?: string[];
  required: boolean;
  helper?: string;
  order: number;
};

export function listCustomFields(form: CustomFieldForm) {
  return apiGet<CustomFieldDto[]>('/custom-fields', { params: { form } });
}

export type CustomFieldPayload = {
  form: CustomFieldForm;
  label: string;
  type: CustomFieldType;
  options?: string[];
  required?: boolean;
  helper?: string;
};

// `order` is never sent — the backend assigns it itself on create
// (current max + 1 within that form) and update never has any reason to
// change it (see businesslogic/customField.js#addCustomField).
export function addCustomField(payload: CustomFieldPayload) {
  return apiPost<CustomFieldDto>('/custom-fields', payload);
}

export function updateCustomField(fieldId: string, payload: CustomFieldPayload) {
  return apiPut<CustomFieldDto>(`/custom-fields/${fieldId}`, payload);
}

export function deleteCustomField(fieldId: string) {
  return apiDelete<CustomFieldDto>(`/custom-fields/${fieldId}`);
}

// orderedIds is every field id for `form`, in its new display order —
// the backend writes each one's `order` from its index in this array
// (businesslogic/customField.js#reorderCustomFields) and returns the
// full, freshly-sorted list for that form.
export function reorderCustomFields(form: CustomFieldForm, orderedIds: string[]) {
  return apiPut<CustomFieldDto[]>('/custom-fields/reorder', { form, orderedIds });
}

// A field's answer shape follows its type: a string for SHORT_TEXT/
// LONG_TEXT/DATE/SINGLE_SELECT, a number for NUMBER, a boolean for
// YES_NO, or a string array for MULTI_SELECT — matching hms-frontend-
// react's CustomFieldRenderer.js exactly, since these are the same
// fields/answers either app could submit.
export type CustomFieldValue = {
  fieldId: string;
  value: unknown;
};

function isBlank(value: unknown) {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

// Same rule hms-backend-node's own validateRequiredCustomFields
// (businesslogic/customField.js) applies server-side — mirrored here so a
// required field left blank shows an inline error instead of a round trip
// to find out.
export function validateCustomFieldValues(fields: CustomFieldDto[], valuesByFieldId: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (field.required && isBlank(valuesByFieldId[field._id])) {
      errors[field._id] = 'This field is required.';
    }
  }
  return errors;
}

// {[fieldId]: value} -> [{fieldId, value}], dropping fields that were
// never answered rather than sending null/undefined for every unset
// optional field — same as hms-frontend-react's toCustomFieldValuesPayload.
export function toCustomFieldValuesPayload(valuesByFieldId: Record<string, unknown>): CustomFieldValue[] {
  return Object.entries(valuesByFieldId)
    .filter(([, value]) => !isBlank(value))
    .map(([fieldId, value]) => ({ fieldId, value }));
}

// The inverse, for seeding edit mode's form state from an existing
// reservation's already-answered values.
export function customFieldValuesToMap(values: CustomFieldValue[] | undefined): Record<string, unknown> {
  return Object.fromEntries((values ?? []).map((v) => [v.fieldId, v.value]));
}

// reservation.customFieldValues (raw [{fieldId, value}] pairs) matched up
// with their field definitions — for reservation/[id].tsx's read-only
// Guest Info display. Drops any value whose field was since deleted and
// any field that was never answered, same as hms-frontend-react's
// pairCustomFieldValues (helpers/customFields.js).
export function pairCustomFieldValues(fields: CustomFieldDto[], values: CustomFieldValue[]) {
  return values
    .map((v) => {
      const field = fields.find((f) => f._id === v.fieldId);
      return field && !isBlank(v.value) ? { field, value: v.value } : null;
    })
    .filter((pair): pair is { field: CustomFieldDto; value: unknown } => pair !== null);
}

// A field's stored value shape depends on its type (see
// CustomFieldInput in edit-guest.tsx) — this renders it back to plain,
// readable text for that read-only display, same as hms-frontend-react's
// formatCustomFieldValue.
export function formatCustomFieldValue(field: CustomFieldDto, value: unknown): string {
  if (isBlank(value)) return '—';
  switch (field.type) {
    case 'YES_NO':
      return value ? 'Yes' : 'No';
    case 'MULTI_SELECT':
      return Array.isArray(value) ? value.join(', ') : String(value);
    case 'DATE':
      return new Date(value as string).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    default:
      return String(value);
  }
}
