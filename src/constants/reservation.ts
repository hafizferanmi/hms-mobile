import { colors } from '@/design/theme';

// Shared vocabulary for the reservation flow (design/design-reference/
// reservations.md's Flow B) — ReservationsList, the Detail hub, and its
// Charges tab all show the same guest/folio statuses, so this lives here
// once rather than being redefined per screen.
export type ReservationStatus = 'RESERVED' | 'IN_HOUSE' | 'CHECKED_OUT' | 'CANCELED';

export const RESERVATION_STATUS_META: Record<
  ReservationStatus,
  { label: string; dot: string; bg: string; text: string }
> = {
  RESERVED: { label: 'Reserved', dot: colors.amber, bg: colors.amberSoft, text: colors.amber },
  IN_HOUSE: { label: 'In House', dot: colors.success, bg: colors.successSoft, text: colors.success },
  CHECKED_OUT: { label: 'Checked out', dot: colors.slate, bg: colors.slateSoft, text: colors.slate },
  CANCELED: { label: 'Canceled', dot: colors.danger, bg: colors.dangerSoft, text: colors.danger },
};
