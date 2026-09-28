import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { StatsAreaTrendCard } from '@/components/stats-area-trend-card';
import { StatsReportShell } from '@/components/stats-report-shell';
import { colors, fonts } from '@/design/theme';
import { useAccommodationSummary } from '@/hooks/use-analytics';
import { defaultStatsRange, formatTrendLabel, percentChange, type StatsDateRange } from '@/utils/stats-date-range';
import { formatNairaCompact } from '@/utils/stats-format';

// Metrics.html (hms-backend-node calls this report "Accommodation"). All 4
// KPIs and the occupancy trend are real; there's just no comparison delta
// computed server-side for any of them, so this screen fetches the prior
// period itself (useAccommodationSummary) and diffs all 4 at once. The web
// app's per-room-type breakdown tables aren't shown here — out of scope
// per the mobile mockup, which only has the 4 KPIs + one trend chart.

function TrendBadge({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const up = pct >= 0;
  return (
    <View style={styles.trendRow}>
      <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={up ? colors.success : colors.coral} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        {up ? <Path d="M4 15l6-6 4 4 8-8" /> : <Path d="M4 9l6 6 4-4 8 8" />}
      </Svg>
      <Text style={[styles.trendText, { color: up ? colors.success : colors.coral }]}>
        {up ? '+' : ''}
        {pct}%
      </Text>
    </View>
  );
}

function OccupancyIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={4} width={18} height={16} rx={2} />
      <Path d="M3 10h18" />
    </Svg>
  );
}
function AdrIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.coral} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2a10 10 0 1 0 10 10H12z" />
      <Path d="M12 2a10 10 0 0 1 10 10" />
    </Svg>
  );
}
function RevparIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.amber} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 17l6-6 4 4 8-8" />
      <Path d="M21 7v6h-6" />
    </Svg>
  );
}
function StayLengthIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.purple} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={16} rx={2} />
      <Path d="M3 10h18" />
    </Svg>
  );
}

const EXPLANATION_BULLETS = [
  'Occupancy is room-nights sold divided by total available room-nights (every room you have, across every day in the range).',
  'ADR (Average Daily Rate) is accommodation revenue divided by room-nights sold. RevPAR (Revenue Per Available Room) divides that same revenue by every available room-night instead, whether sold or not.',
  'Average length of stay is room-nights sold divided by the number of days in the range.',
  'Cancelled reservations are excluded from all 4 figures. Each comparison percentage is calculated against the immediately preceding period of the same length.',
];

export default function MetricsReportScreen() {
  const [dateRange, setDateRange] = useState<StatsDateRange>(defaultStatsRange);
  const { current, priorTotals } = useAccommodationSummary(dateRange);
  const { data, isLoading, isError, error, refetch, isRefetching } = current;

  return (
    <StatsReportShell
      reportKey="metrics"
      title="Metrics"
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
          <View style={styles.kpiGrid}>
            <View style={styles.kpi}>
              <View style={[styles.kpiIcon, { backgroundColor: colors.navySoft }]}>
                <OccupancyIcon />
              </View>
              <Text style={styles.kpiLabel}>Occupancy</Text>
              <Text style={styles.kpiValue}>{Math.round(data.totals.occupancyPct)}%</Text>
              <TrendBadge pct={priorTotals ? percentChange(data.totals.occupancyPct, priorTotals.occupancyPct) : null} />
            </View>
            <View style={styles.kpi}>
              <View style={[styles.kpiIcon, { backgroundColor: colors.coralSoft }]}>
                <AdrIcon />
              </View>
              <Text style={styles.kpiLabel}>ADR</Text>
              <Text style={styles.kpiValue}>{formatNairaCompact(data.totals.adr)}</Text>
              <TrendBadge pct={priorTotals ? percentChange(data.totals.adr, priorTotals.adr) : null} />
            </View>
            <View style={styles.kpi}>
              <View style={[styles.kpiIcon, { backgroundColor: colors.amberSoft }]}>
                <RevparIcon />
              </View>
              <Text style={styles.kpiLabel}>RevPAR</Text>
              <Text style={styles.kpiValue}>{formatNairaCompact(data.totals.revpar)}</Text>
              <TrendBadge pct={priorTotals ? percentChange(data.totals.revpar, priorTotals.revpar) : null} />
            </View>
            <View style={styles.kpi}>
              <View style={[styles.kpiIcon, { backgroundColor: colors.purpleSoft }]}>
                <StayLengthIcon />
              </View>
              <Text style={styles.kpiLabel}>Avg. length of stay</Text>
              <Text style={styles.kpiValue}>{data.totals.avgNightsPerDay.toFixed(1)} nts</Text>
              <TrendBadge pct={priorTotals ? percentChange(data.totals.avgNightsPerDay, priorTotals.avgNightsPerDay) : null} />
            </View>
          </View>

          <StatsAreaTrendCard
            title="Occupancy trend"
            rightValue={`${Math.round(data.totals.occupancyPct)}%`}
            color={colors.navy}
            items={data.dailyTrend.map((d) => ({
              label: formatTrendLabel(d.date, data.dailyTrend.length),
              value: d.occupancy,
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
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpi: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  kpiIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.textMuted,
  },
  kpiValue: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 20,
    color: colors.navyInk,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
  },
});
