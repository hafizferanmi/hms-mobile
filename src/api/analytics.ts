import { apiGet } from './client';

// Mirrors hms-backend-node's src/businesslogic/analytics.js (GET /analytics/*)
// exactly — every field here is real; nothing is computed or renamed on
// the client except where a screen's own file says otherwise. All 5
// endpoints take the same `{from, to}` query (YYYY-MM-DD, inclusive both
// ends) and reject with an error if either is missing — there's no
// "preset" the server understands, so callers always resolve a preset to
// concrete dates first (see src/utils/stats-date-range.ts).
export type AnalyticsRangeParams = { from: string; to: string };

export type AnalyticsRange = { from: string; to: string };

// ---- Revenue Summary --------------------------------------------------
// Buckets: ROOM and PENALTY/COMMISSION charges get their own bucket;
// LAUNDRY/ROOM_SERVICE/MINIBAR/OTHER are all lumped into `extraCharge`.
// There is no separate "F&B" category and no bookings-count series.
export type RevenueBucketKey = 'room' | 'penalty' | 'extraCharge' | 'commission';

export type RevenueTotals = Record<RevenueBucketKey, number> & { total: number };

export type RevenueBreakdownItem = { key: RevenueBucketKey; amount: number; pct: number };

export type RevenueDailyTrendItem = { date: string } & Record<RevenueBucketKey, number> & { total: number };

export type RevenueSummaryResponse = {
  range: AnalyticsRange;
  totals: RevenueTotals;
  breakdown: RevenueBreakdownItem[];
  dailyTrend: RevenueDailyTrendItem[];
};

export function getRevenueSummary(params: AnalyticsRangeParams) {
  return apiGet<RevenueSummaryResponse>('/analytics/revenue-summary', { params });
}

// ---- Transaction Summary -----------------------------------------------
// Amounts only, by payment method — there is no transaction count and no
// received/refunded/pending status anywhere in this data.
export type PaymentMethod = 'POS' | 'CASH' | 'ONLINE' | 'BANK_TRANSFER';

export type TransactionTotals = Record<PaymentMethod, number> & { total: number };

export type TransactionBreakdownItem = { key: PaymentMethod; amount: number; pct: number };

export type TransactionDailyTrendItem = { date: string } & Record<PaymentMethod, number> & { total: number };

export type TransactionSummaryResponse = {
  range: AnalyticsRange;
  totals: TransactionTotals;
  totalCollected: number;
  breakdown: TransactionBreakdownItem[];
  dailyTrend: TransactionDailyTrendItem[];
};

export function getTransactionSummary(params: AnalyticsRangeParams) {
  return apiGet<TransactionSummaryResponse>('/analytics/transaction-summary', { params });
}

// ---- Channel Summary -----------------------------------------------------
// `channels` is whatever channel values actually appear in the range —
// today that's just "WALK_IN" (see hms-backend-node's BOOKING_CHANNEL),
// since there's no OTA integration yet. Both `consumption` (revenue) and
// `roomNights` (nights sold) come back from one call; the mockup's
// Consumption/Room Nights toggle just switches which of the two the
// screen reads, no second request needed.
export type ChannelMetric = {
  totals: Record<string, number> & { total: number };
  breakdown: { key: string; amount: number; pct: number }[];
  dailyTrend: ({ date: string } & Record<string, number>)[];
};

export type ChannelSummaryResponse = {
  range: AnalyticsRange;
  channels: string[];
  consumption: ChannelMetric;
  roomNights: ChannelMetric;
  // By room-nights specifically (not revenue) — see channel.tsx for why
  // this screen computes its own "top channel" per the active segment
  // instead of using this field directly.
  topChannel: { key: string; amount: number; pct: number } | null;
};

export function getChannelSummary(params: AnalyticsRangeParams) {
  return apiGet<ChannelSummaryResponse>('/analytics/channel-summary', { params });
}

// ---- Sales Summary -------------------------------------------------------
// Every reservation SOLD (created) in the range, each at its full value —
// no category split exists (a reservation's `amount` is every charge ever
// posted to it, summed as one line), so sales-revenue.tsx shows only the
// hero total and the daily trend, no "by category" chart.
export type SalesSummaryResponse = {
  range: AnalyticsRange;
  totals: { total: number; reservationCount: number };
  dailyTrend: { date: string; total: number }[];
  reservations: {
    checkInId: string;
    guestName: string;
    phone: string | null;
    reservationNumberMasked: string | null;
    channel: string;
    createdAt: string;
    amount: number;
    creatorId: string | null;
    creatorName: string;
  }[];
};

export function getSalesSummary(params: AnalyticsRangeParams) {
  return apiGet<SalesSummaryResponse>('/analytics/sales-summary', { params });
}

// ---- Accommodation (Metrics) Summary --------------------------------------
// Trimmed here to just the 4 KPIs + occupancy trend metrics.tsx needs —
// the full response also has a per-room-type `details` breakdown (4
// tables on the web app) that's intentionally not shown on mobile.
export type AccommodationSummaryResponse = {
  range: AnalyticsRange;
  inventory: { roomTypeCount: number; roomCount: number };
  totals: {
    roomCharges: number;
    roomNights: number;
    occupancyPct: number;
    adr: number;
    revpar: number;
    avgNightsPerDay: number;
  };
  dailyTrend: {
    date: string;
    roomCharges: number;
    roomNights: number;
    adr: number;
    occupancy: number;
    revpar: number;
  }[];
};

export function getAccommodationSummary(params: AnalyticsRangeParams) {
  return apiGet<AccommodationSummaryResponse>('/analytics/accommodation', { params });
}
