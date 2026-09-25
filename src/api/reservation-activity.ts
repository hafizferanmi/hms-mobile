import { apiGet, apiPost } from './client';

// The Charges/Others tabs' data (reservation/[id].tsx), plus add-charge.tsx
// and record-payment.tsx — everything scoped to one reservation's
// financial and activity history, as opposed to src/api/reservations.ts's
// CRUD on the reservation itself. Mirrors hms-backend-node's
// ReservationCharge/ReservationPayment/ReservationLog models and their
// businesslogic modules.

export type ChargeCategory = 'ROOM' | 'LAUNDRY' | 'ROOM_SERVICE' | 'MINIBAR' | 'PENALTY' | 'COMMISSION' | 'OTHER';

export const CHARGE_CATEGORY_LABEL: Record<ChargeCategory, string> = {
  ROOM: 'Room',
  LAUNDRY: 'Laundry',
  ROOM_SERVICE: 'Room service',
  MINIBAR: 'Minibar',
  PENALTY: 'Penalty',
  COMMISSION: 'Commission',
  OTHER: 'Other',
};

export type ChargeDto = {
  _id: string;
  category: ChargeCategory;
  description: string;
  amount: number;
  note?: string;
  createdAt: string;
};

export type PaymentMethod = 'POS' | 'CASH' | 'ONLINE' | 'BANK_TRANSFER';

export type PaymentDto = {
  _id: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  note?: string;
  recordedBy?: { _id: string; name: string } | null;
  createdAt: string;
};

export type ReservationLogType =
  | 'CREATED'
  | 'UPDATED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CHECKOUT_REVERTED'
  | 'ROOM_CHANGED'
  | 'STAY_EXTENDED'
  | 'CANCELLED'
  | 'GUEST_ADDED'
  | 'CHARGE_ADDED'
  | 'CHARGE_UPDATED'
  | 'CHARGE_DELETED'
  | 'PAYMENT_RECORDED'
  | 'INVOICE_SENT'
  | 'EMAIL_SENT';

export type ReservationLogDto = {
  _id: string;
  type: ReservationLogType;
  message: string;
  performedBy?: { _id: string; name: string } | null;
  createdAt: string;
};

export function listCharges(checkInId: string) {
  return apiGet<ChargeDto[]>(`/check-ins/${checkInId}/charges`);
}

export function addCharge(
  checkInId: string,
  payload: { category: ChargeCategory; description: string; amount: number; note?: string },
) {
  return apiPost<ChargeDto>(`/check-ins/${checkInId}/charges`, payload);
}

export function listPayments(checkInId: string) {
  return apiGet<PaymentDto[]>(`/check-ins/${checkInId}/payments`);
}

export function addPayment(
  checkInId: string,
  payload: { amount: number; method: PaymentMethod; reference?: string; note?: string },
) {
  return apiPost<PaymentDto>(`/check-ins/${checkInId}/payments`, payload);
}

export function listActivityLogs(checkInId: string) {
  return apiGet<ReservationLogDto[]>(`/check-ins/${checkInId}/logs`);
}

// -----------------------------------------------------------------------
// View models the Charges/Others tabs render — same shapes
// src/mock/reservations.ts used to hand-author, now built from real data.
// -----------------------------------------------------------------------

export type FolioEntry = {
  id: string;
  kind: 'CHARGE' | 'PAYMENT';
  title: string;
  subtitle: string;
  amount: number;
  badge?: string;
};

export type ActivityTone = 'success' | 'neutral' | 'amber' | 'danger';
export type ActivityIcon = 'check-in' | 'check-out' | 'edit' | 'payment' | 'charge' | 'visitor' | 'invoice';

export type ActivityEntry = {
  id: string;
  tone: ActivityTone;
  icon: ActivityIcon;
  title: string;
  actor: string;
  timestamp: string;
};

// Every RESERVATION_LOG_TYPE gets a mapping, including the ones no mobile
// screen can produce yet (ROOM_CHANGED, STAY_EXTENDED, CANCELLED, etc.) —
// this same reservation may also be edited from hms-frontend-react, so its
// log can legitimately contain entries this app never wrote itself.
const LOG_TYPE_META: Record<ReservationLogType, { icon: ActivityIcon; tone: ActivityTone }> = {
  CREATED: { icon: 'edit', tone: 'success' },
  UPDATED: { icon: 'edit', tone: 'neutral' },
  CHECKED_IN: { icon: 'check-in', tone: 'success' },
  CHECKED_OUT: { icon: 'check-out', tone: 'neutral' },
  CHECKOUT_REVERTED: { icon: 'check-in', tone: 'amber' },
  ROOM_CHANGED: { icon: 'edit', tone: 'neutral' },
  STAY_EXTENDED: { icon: 'edit', tone: 'neutral' },
  CANCELLED: { icon: 'edit', tone: 'danger' },
  GUEST_ADDED: { icon: 'visitor', tone: 'success' },
  CHARGE_ADDED: { icon: 'charge', tone: 'amber' },
  CHARGE_UPDATED: { icon: 'charge', tone: 'amber' },
  CHARGE_DELETED: { icon: 'charge', tone: 'amber' },
  PAYMENT_RECORDED: { icon: 'payment', tone: 'success' },
  INVOICE_SENT: { icon: 'invoice', tone: 'neutral' },
  EMAIL_SENT: { icon: 'invoice', tone: 'neutral' },
};

function formatFolioDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatLogTimestamp(iso: string) {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  return `${datePart}, ${timePart}`;
}

// Charges and payments are fetched (and already sorted oldest-first) from
// two separate endpoints, so combining them into one folio needs a merge
// by createdAt rather than a simple concat.
export function toFolioEntries(charges: ChargeDto[], payments: PaymentDto[]): FolioEntry[] {
  const chargeEntries: (FolioEntry & { createdAt: string })[] = charges.map((c) => ({
    id: c._id,
    kind: 'CHARGE',
    title: c.description,
    subtitle: `${CHARGE_CATEGORY_LABEL[c.category]} · ${formatFolioDate(c.createdAt)}`,
    amount: c.amount,
    createdAt: c.createdAt,
  }));
  const paymentEntries: (FolioEntry & { createdAt: string })[] = payments.map((p) => ({
    id: p._id,
    kind: 'PAYMENT',
    title: 'Payment received',
    subtitle: formatFolioDate(p.createdAt),
    amount: p.amount,
    badge: p.method.replace('_', ' '),
    createdAt: p.createdAt,
  }));
  return [...chargeEntries, ...paymentEntries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function toActivityEntries(logs: ReservationLogDto[]): ActivityEntry[] {
  return logs.map((log) => {
    const meta = LOG_TYPE_META[log.type];
    return {
      id: log._id,
      tone: meta.tone,
      icon: meta.icon,
      title: log.message,
      actor: log.performedBy?.name ?? 'Staff',
      timestamp: formatLogTimestamp(log.createdAt),
    };
  });
}
