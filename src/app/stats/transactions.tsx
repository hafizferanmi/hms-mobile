import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { PaymentMethod } from '@/api/analytics';
import { StatsBarTrendCard } from '@/components/stats-bar-trend-card';
import { StatsDonutCard } from '@/components/stats-donut-card';
import { StatsHeroCard } from '@/components/stats-hero-card';
import { StatsReportShell } from '@/components/stats-report-shell';
import { colors, fonts } from '@/design/theme';
import { useTransactionSummary } from '@/hooks/use-analytics';
import { defaultStatsRange, formatTrendLabel, type StatsDateRange } from '@/utils/stats-date-range';
import { formatCompactNumber, formatNairaCompact } from '@/utils/stats-format';

// Transactions.html. The mockup's hero (a transaction count, plus payments
// received/refunds/pending) and its "by status" framing aren't backed by
// any real data — hms-backend-node only tracks payment AMOUNTS by method,
// no count and no received/refunded/pending status anywhere. So this
// screen's hero and donut both show the one real breakdown (by payment
// method) instead, and the trend chart is the amount collected per day,
// not a transaction count.

const METHOD_META: Record<PaymentMethod, { label: string; color: string }> = {
  CASH: { label: 'Cash', color: colors.success },
  POS: { label: 'POS / Card', color: colors.navy },
  BANK_TRANSFER: { label: 'Bank transfer', color: colors.amber },
  ONLINE: { label: 'Online', color: colors.purple },
};
const METHOD_ORDER: PaymentMethod[] = ['CASH', 'POS', 'BANK_TRANSFER', 'ONLINE'];

function CashIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3.5 2" />
    </Svg>
  );
}
function CardIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9.5h18M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />
    </Svg>
  );
}
function BankIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9.5 12 3l9 6.5" />
      <Path d="M5 9v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
    </Svg>
  );
}
function OnlineIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </Svg>
  );
}
const METHOD_ICON: Record<PaymentMethod, React.ReactNode> = {
  CASH: <CashIcon />,
  POS: <CardIcon />,
  BANK_TRANSFER: <BankIcon />,
  ONLINE: <OnlineIcon />,
};

const EXPLANATION_BULLETS = [
  'This shows money actually collected — every payment recorded in the selected date range, on the day it was recorded.',
  'Grouped by payment method: cash, POS/card, bank transfer or online.',
  'Independent of Revenue: a payment can be collected on a different day than the stay it’s for.',
];

export default function TransactionsReportScreen() {
  const [dateRange, setDateRange] = useState<StatsDateRange>(defaultStatsRange);
  const { current } = useTransactionSummary(dateRange);
  const { data, isLoading, isError, error, refetch, isRefetching } = current;

  return (
    <StatsReportShell
      reportKey="transactions"
      title="Transactions"
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
            eyebrow="Total collected"
            total={formatNairaCompact(data.totalCollected)}
            items={METHOD_ORDER.map((method) => ({
              icon: METHOD_ICON[method],
              label: METHOD_META[method].label,
              value: formatNairaCompact(data.totals[method]),
            }))}
          />

          <StatsDonutCard
            title="By payment method"
            centerValue={formatCompactNumber(data.totalCollected)}
            centerLabel="COLLECTED"
            items={data.breakdown.map((b) => ({
              label: METHOD_META[b.key].label,
              value: b.amount,
              pct: b.pct,
              color: METHOD_META[b.key].color,
            }))}
          />

          <StatsBarTrendCard
            title="Amount collected per day"
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
