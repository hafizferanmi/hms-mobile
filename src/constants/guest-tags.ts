import { colors } from '@/design/theme';

import type { GuestTagCategory } from '@/api/guest-tags';

// AddTagSheet.html/NewTagSheet.html — every tag's pill color is fully
// determined by its category (there's no separate freeform color picker
// in the design), so this is the one place that mapping lives. The
// GuestTag model's own `color` field is only ever set (to this same hex)
// when a tag is created — nothing reads it back for rendering, so a tag
// always looks the same as its category regardless of what's stored.
export const GUEST_TAG_CATEGORY_ORDER: GuestTagCategory[] = [
  'STATUS',
  'PREFERENCES',
  'BOOKING',
  'OCCASION',
  'CAUTION',
];

export const GUEST_TAG_CATEGORY_META: Record<GuestTagCategory, { label: string; color: string; soft: string }> = {
  STATUS: { label: 'Status', color: colors.success, soft: colors.successSoft },
  PREFERENCES: { label: 'Preferences', color: colors.purple, soft: colors.purpleSoft },
  BOOKING: { label: 'Booking', color: colors.slate, soft: colors.slateSoft },
  OCCASION: { label: 'Occasion', color: colors.amber, soft: colors.amberSoft },
  CAUTION: { label: 'Caution', color: colors.coral, soft: colors.coralSoft },
};
