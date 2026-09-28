import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { StatsBarTrendCard } from '@/components/stats-bar-trend-card';
import { StatsDonutCard } from '@/components/stats-donut-card';
import { StatsHeroCard } from '@/components/stats-hero-card';
import { StatsReportShell } from '@/components/stats-report-shell';
import { colors, fonts } from '@/design/theme';
import { useRevenueSummary } from '@/hooks/use-analytics';
import { defaultStatsRange, formatTrendLabel, percentChange, type StatsDateRange } from '@/utils/stats-date-range';
import { formatCompactNumber, formatNairaCompact } from '@/utils/stats-format';

// Revenue.html. Real buckets are Room/Penalty/Commission/Extra-charges
// (LAUNDRY/ROOM_SERVICE/MINIBAR/OTHER lumped together) — not the mockup's
// Room/F&B/Other, since there's no tracked "F&B" category server-side.
// Penalty+Commission are merged into one "Other" row/slice here to keep
// the same 3-item shape as the mockup. There's also no bookings-count
// series, so the trend chart is Revenue only (no Revenue/Bookings toggle).
// The "vs last week" delta isn't computed server-side either — this
// screen fetches the prior period itself (useRevenueSummary) and diffs
// the two totals.

function RoomIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9.5 12 3l9 6.5" />
      <Path d="M5 9v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
    </Svg>
  );
}
function ExtraChargeIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 10h16M6 6h12v12H6z" />
    </Svg>
  );
}
function OtherIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2a10 10 0 1 0 10 10H12z" />
      <Path d="M12 2a10 10 0 0 1 10 10" />
    </Svg>
  );
}

const EXPLANATION_BULLETS = [
  'Room revenue is a stay’s room charge spread evenly across every night it covers, so a booking straddling the edge of your date range only counts the nights inside it.',
  'Extra charges (laundry, room service, minibar and other one-off charges), penalties and commissions are each counted on the day they were recorded.',
  'Cancelled reservations are excluded entirely — a stay that never happened never earned any revenue.',
  'The comparison percentage is calculated against the immediately preceding period of the same length.',
];

export default function RevenueReportScreen() {
  const [dateRange, setDateRange] = useState<StatsDateRange>(defaultStatsRange);
  const { current, priorTotal } = useRevenueSummary(dateRange);
  const { data, isLoading, isError, error, refetch, isRefetching } = current;

  const deltaPct = data && priorTotal !== undefined ? percentChange(data.totals.total, priorTotal) : null;

  const otherAmount = (data?.totals.penalty ?? 0) + (data?.totals.commission ?? 0);
  const otherPct = data?.totals.total ? (otherAmount / data.totals.total) * 100 : 0;

  return (
    <StatsReportShell
      reportKey="revenue"
      title="Revenue"
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
            eyebrow="Business overview"
            total={formatNairaCompact(data.totals.total)}
            deltaPct={deltaPct}
            deltaCaption="vs previous period"
            items={[
              { icon: <RoomIcon />, label: 'Room revenue', value: formatNairaCompact(data.totals.room) },
              { icon: <ExtraChargeIcon />, label: 'Extra charges', value: formatNairaCompact(data.totals.extraCharge) },
              { icon: <OtherIcon />, label: 'Penalties & commission', value: formatNairaCompact(otherAmount) },
            ]}
          />

          <StatsDonutCard
            title="Revenue by category"
            centerValue={formatCompactNumber(data.totals.total)}
            centerLabel="TOTAL NGN"
            items={[
              { label: 'Rooms', value: data.totals.room, pct: data.breakdown.find((b) => b.key === 'room')?.pct ?? 0, color: colors.navy },
              {
                label: 'Extra charges',
                value: data.totals.extraCharge,
                pct: data.breakdown.find((b) => b.key === 'extraCharge')?.pct ?? 0,
                color: colors.coral,
              },
              { label: 'Penalties & commission', value: otherAmount, pct: otherPct, color: colors.amber },
            ]}
          />

          <StatsBarTrendCard
            title="Trend"
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
