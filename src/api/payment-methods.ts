import { apiDelete, apiGet, apiPost, apiPut } from './client';

// Mirrors hms-backend-node's PaymentMethod model + businesslogic/
// paymentMethod.js — a per-company, ordered, enable/disable-able list of
// checkout options (Settings > Payment Methods). Distinct from the fixed
// POS/CASH/ONLINE/BANK_TRANSFER enum record-payment.tsx already uses when
// actually recording a payment against a reservation — that flow isn't
// wired to this yet (a later change reads this list instead of the fixed
// enum); this is purely the settings screen that manages the list itself.
export type PaymentMethodCategory =
  | 'CASH'
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'PAYMENT_GATEWAY'
  | 'OTA_CHANNEL'
  | 'DIGITAL_WALLET';

export type PaymentMethodDto = {
  _id: string;
  name: string;
  category: PaymentMethodCategory;
  enabled: boolean;
  order: number;
};

// GET /payment-methods lazy-seeds Cash/Card/Bank Transfer server-side the
// first time a company has none — see getPaymentMethods in
// businesslogic/paymentMethod.js — so this never needs its own empty-state
// "no methods yet" handling for a brand new company.
export function listPaymentMethods() {
  return apiGet<PaymentMethodDto[]>('/payment-methods');
}

export type PaymentMethodPayload = {
  name: string;
  category: PaymentMethodCategory;
  enabled?: boolean;
};

export function addPaymentMethod(payload: PaymentMethodPayload) {
  return apiPost<PaymentMethodDto>('/payment-methods', payload);
}

export function updatePaymentMethod(paymentMethodId: string, payload: Partial<PaymentMethodPayload>) {
  return apiPut<PaymentMethodDto>(`/payment-methods/${paymentMethodId}`, payload);
}

// Every payment method id for this company, in its new display order —
// mirrors reorderCustomFields' own bulk-reorder shape.
export function reorderPaymentMethods(orderedIds: string[]) {
  return apiPut<PaymentMethodDto[]>('/payment-methods/reorder', { orderedIds });
}

export function deletePaymentMethod(paymentMethodId: string) {
  return apiDelete<PaymentMethodDto>(`/payment-methods/${paymentMethodId}`);
}
