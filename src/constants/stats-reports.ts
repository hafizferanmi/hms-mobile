// The 5 report screens under src/app/stats/ — shared by the Statistics
// tab's entry grid and every report screen's own "switch report" action
// sheet (title chevron), so both always list the same 5 in the same order.
export type StatsReportKey = 'revenue' | 'transactions' | 'channel' | 'sales-revenue' | 'metrics';

export const STATS_REPORTS: { key: StatsReportKey; label: string; route: string }[] = [
  { key: 'revenue', label: 'Revenue', route: '/stats/revenue' },
  { key: 'transactions', label: 'Transactions', route: '/stats/transactions' },
  { key: 'channel', label: 'Channel', route: '/stats/channel' },
  { key: 'sales-revenue', label: 'Sales Revenue', route: '/stats/sales-revenue' },
  { key: 'metrics', label: 'Metrics', route: '/stats/metrics' },
];
