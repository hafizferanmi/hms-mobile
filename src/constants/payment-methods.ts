import { colors } from '@/design/theme';

import type { PaymentMethodCategory } from '@/api/payment-methods';

// Mirrors hms-backend-node's constants/paymentMethodCategory.js. The
// category alone drives a row's icon, color, and sub-label — there's no
// separate stored icon/color per payment method.
export const PAYMENT_METHOD_CATEGORY_LABEL: Record<PaymentMethodCategory, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
  PAYMENT_GATEWAY: 'Payment Gateway',
  OTA_CHANNEL: 'OTA Channel',
  DIGITAL_WALLET: 'Digital Wallet',
};

export const PAYMENT_METHOD_CATEGORY_ORDER: PaymentMethodCategory[] = [
  'CASH',
  'CARD',
  'BANK_TRANSFER',
  'PAYMENT_GATEWAY',
  'OTA_CHANNEL',
  'DIGITAL_WALLET',
];

export const PAYMENT_METHOD_CATEGORY_META: Record<PaymentMethodCategory, { color: string; soft: string }> = {
  CASH: { color: colors.success, soft: colors.successSoft },
  CARD: { color: colors.navy, soft: colors.navySoft },
  BANK_TRANSFER: { color: colors.slate, soft: colors.slateSoft },
  PAYMENT_GATEWAY: { color: colors.coral, soft: colors.coralSoft },
  OTA_CHANNEL: { color: colors.amber, soft: colors.amberSoft },
  DIGITAL_WALLET: { color: colors.purple, soft: colors.purpleSoft },
};
