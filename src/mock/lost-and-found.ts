import { colors } from '@/design/theme';

// -----------------------------------------------------------------------
// New feature (not part of design/design-reference/reservations.md) —
// mockups pasted directly in chat: "Lost & Found", its Filter sheet, and
// "Log a Found Item". Reachable from the More page (see src/app/more.tsx).
// TODO(data): sourced from a lost-and-found endpoint once one exists —
// hms-backend-node doesn't have this resource yet.
// -----------------------------------------------------------------------

export type LostFoundStatus = 'UNCLAIMED' | 'CLAIMED' | 'RETURNED' | 'DISPOSED';

export const LOST_FOUND_STATUS_META: Record<
  LostFoundStatus,
  { label: string; dot: string; bg: string; text: string }
> = {
  UNCLAIMED: { label: 'Unclaimed', dot: colors.amber, bg: colors.amberSoft, text: colors.amber },
  CLAIMED: { label: 'Claimed', dot: colors.navy, bg: colors.navySoft, text: colors.navy },
  RETURNED: { label: 'Returned', dot: colors.success, bg: colors.successSoft, text: colors.success },
  DISPOSED: { label: 'Disposed', dot: colors.slate, bg: colors.slateSoft, text: colors.slate },
};

export const LOST_FOUND_STATUS_ORDER: LostFoundStatus[] = ['UNCLAIMED', 'CLAIMED', 'RETURNED', 'DISPOSED'];

export const LOST_FOUND_CATEGORIES = ['Wallets & bags', 'Electronics', 'Jewelry', 'Clothing'];

// Same "Boda Afisii" already used as the actor on the Reservation Detail
// hub's Activity tab (src/mock/reservations.ts) — one consistent example
// staff member across the app's mock data, plus a couple more for variety.
export const STAFF_NAMES = ['Boda Afisii', 'Chidi Okafor', 'Amara Nwosu'];

export type LostFoundItem = {
  id: string;
  description: string;
  category: string;
  foundLocation: string;
  foundDate: Date;
  status: LostFoundStatus;
};

export const MOCK_LOST_FOUND_ITEMS: LostFoundItem[] = [
  {
    id: '1',
    description: 'Black wallet in room 301',
    category: 'Wallets & bags',
    foundLocation: 'Room 301',
    foundDate: new Date(2026, 8, 6),
    status: 'CLAIMED',
  },
];
