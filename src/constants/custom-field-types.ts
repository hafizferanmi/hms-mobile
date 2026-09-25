import type { CustomFieldType } from '@/api/custom-fields';
import { colors } from '@/design/theme';

// Shared between custom-fields.tsx's list rows and add-custom-field.tsx's
// type picker — one color/label per CUSTOM_FIELD_TYPE so both screens
// agree on what each type looks like, matching AddCustomField.html's own
// type-card grid (which is the only mockup that shows all 7 at once).
export const CUSTOM_FIELD_TYPE_ORDER: CustomFieldType[] = [
  'SHORT_TEXT',
  'LONG_TEXT',
  'NUMBER',
  'DATE',
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'YES_NO',
];

export const CUSTOM_FIELD_TYPE_META: Record<CustomFieldType, { label: string; bg: string; color: string }> = {
  SHORT_TEXT: { label: 'Short text', bg: colors.navySoft, color: colors.navy },
  LONG_TEXT: { label: 'Long text', bg: colors.slateSoft, color: colors.slate },
  NUMBER: { label: 'Number', bg: colors.amberSoft, color: colors.amber },
  DATE: { label: 'Date', bg: colors.coralSoft, color: colors.coral },
  SINGLE_SELECT: { label: 'Single select', bg: colors.purpleSoft, color: colors.purple },
  MULTI_SELECT: { label: 'Multi select', bg: colors.purpleSoft, color: colors.purple },
  YES_NO: { label: 'Yes / No', bg: colors.successSoft, color: colors.success },
};

// list rows' second line, e.g. "Single select · 3 options".
export function describeFieldType(type: CustomFieldType, options: string[] | undefined) {
  const label = CUSTOM_FIELD_TYPE_META[type].label;
  if ((type === 'SINGLE_SELECT' || type === 'MULTI_SELECT') && options?.length) {
    return `${label} · ${options.length} option${options.length === 1 ? '' : 's'}`;
  }
  return label;
}

export function isOptionsType(type: CustomFieldType) {
  return type === 'SINGLE_SELECT' || type === 'MULTI_SELECT';
}
