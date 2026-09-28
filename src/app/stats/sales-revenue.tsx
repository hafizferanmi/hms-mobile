import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { StatsAreaTrendCard } from '@/components/stats-area-trend-card';
import { StatsHeroCard } from '@/components/stats-hero-card';
import { StatsReportShell } from '@/components/stats-report-shell';
import { colors, fonts } from '@/design/theme';
import { useSalesSummary } from '@/hooks/use-analytics';
import { defaultStatsRange, formatTrendLabel, percentChange, type StatsDateRange } from '@/utils/stats-date-range';
import { formatNairaCompact } from '@/utils/stats-format';

// SalesRevenue.html. The mockup's "Sales by category" donut (room/F&B/spa/
// laundry) has no backing data — a reservation's sale total here is
// every charge ever posted to it summed as one line, with no per-category
// split kept anywhere — so this screen shows only the hero total and the
// trend, both real. "vs last week" is computed the same way as Revenue's:
// this screen fetches the prior period itself and diffs the two totals.

const EXPLANATION_BULLETS = [
  'Sales revenue counts every reservation actually booked (created) within the selected date range, at its full value — this answers "what did we sell", not "what did we earn this week" (that’s the Revenue report).',
  'Each reservation is counted once, for the sum of every charge ever posted to it — including ones added after the booking date, like a minibar charge added mid-stay.',
  'Cancelled reservations are excluded — a cancelled booking was never really a completed sale.',
  'The comparison percentage is calculated against the immediately preceding period of the same length.',
];

export default function SalesRevenueReportScreen() {
  const [dateRange, setDateRange] = useState<StatsDateRange>(defaultStatsRange);
  const { current, priorTotal } = useSalesSummary(dateRange);
  const { data, isLoading, isError, error, refetch, isRefetching } = current;

  const deltaPct = data && priorTotal !== undefined ? percentChange(data.totals.total, priorTotal) : null;

  return (
    <StatsReportShell
      reportKey="sales-revenue"
      title="Sales Revenue"
      dateRange={dateRange}
      onApplyDateRange={setDateRange}
      explanationBullets={EXPLANATION_BULLETS}
      refreshing={isRefetching}
      onRefresh={refetch}>
      {isLoading ? (
        <ActivityIndicator color={colors.navy} style={styles.loading} />
      ) : isError || !data ? (
        <Text style={styles.errorText}>{error?.message ?? 'Could not load this report.'}</Text>
      ) : (
        <>
          <StatsHeroCard
            eyebrow="Total sales revenue"
            total={formatNairaCompact(data.totals.total)}
            deltaPct={deltaPct}
            deltaCaption="vs previous period"
          />

          <StatsAreaTrendCard
            title="Sales trend"
            color={colors.coral}
            items={data.dailyTrend.map((d) => ({
              label: formatTrendLabel(d.date, data.dailyTrend.length),
              value: d.total,
            }))}
          />
        </>
      )}
    </StatsReportShell>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: 40,
  },
  errorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 40,
  },
});
