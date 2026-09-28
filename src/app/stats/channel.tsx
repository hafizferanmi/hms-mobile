import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { StatsDonutCard } from '@/components/stats-donut-card';
import { StatsReportShell } from '@/components/stats-report-shell';
import { colors, fonts, radii } from '@/design/theme';
import { useChannelSummary } from '@/hooks/use-analytics';
import { defaultStatsRange, percentChange, type StatsDateRange } from '@/utils/stats-date-range';
import { formatCompactNumber, formatNairaCompact } from '@/utils/stats-format';

// Channel.html. `channels` today is really just "WALK_IN" (no OTA
// integration exists yet), so the donut/bar list will show one full slice
// until a real second channel is ever used — that's accurate, not a bug.
//
// Per FLOW.md, the segmented control only swaps the donut+legend's data
// between revenue ("Consumption") and room-nights; the "Room nights by
// channel" bar list is always room-nights regardless of the toggle, hence
// its own fixed title. "Top performing channel" is computed here from
// whichever segment is active (the server's own `topChannel` field is
// always by room-nights, which would show a night COUNT formatted as
// currency when Consumption is selected) — its delta vs the prior period
// is computed the same way every other report's is, since none of this is
// server-computed.

const CHANNEL_COLORS = [colors.navy, colors.coral, colors.amber, colors.purple, colors.slate];

function channelLabel(key: string) {
  if (key === 'WALK_IN') return 'Direct / Walk-in';
  return key
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

function BuildingIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9.5 12 3l9 6.5" />
      <Path d="M5 9v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
    </Svg>
  );
}

const EXPLANATION_BULLETS = [
  'Channel is where a reservation was booked from. Every reservation today comes through Direct / Walk-in — online travel agents and other channels will appear here automatically once they’re connected.',
  'Consumption is accommodation revenue, allocated per night across each stay. Room Nights is simply how many nights were sold, regardless of rate.',
  'Cancelled reservations are excluded from both views.',
  'The comparison percentage on the top channel card is calculated against the immediately preceding period of the same length.',
];

export default function ChannelReportScreen() {
  const [dateRange, setDateRange] = useState<StatsDateRange>(defaultStatsRange);
  const [segment, setSegment] = useState<'consumption' | 'roomNights'>('consumption');
  const { current, prior } = useChannelSummary(dateRange);
  const { data, isLoading, isError, error, refetch, isRefetching } = current;

  const activeMetric = data?.[segment];
  const priorMetric = prior.data?.[segment];

  const topChannel = activeMetric?.breakdown.reduce<{ key: string; amount: number; pct: number } | null>(
    (top, b) => (!top || b.amount > top.amount ? b : top),
    null,
  );
  const topChannelPrior = topChannel ? priorMetric?.totals[topChannel.key] : undefined;
  const topChannelDelta = topChannel && topChannelPrior !== undefined ? percentChange(topChannel.amount, topChannelPrior) : null;

  return (
    <StatsReportShell
      reportKey="channel"
      title="Channel"
      dateRange={dateRange}
      onApplyDateRange={setDateRange}
      explanationBullets={EXPLANATION_BULLETS}
      refreshing={isRefetching}
      onRefresh={refetch}
      headerExtra={
        <View style={styles.segmentedRow}>
          <Pressable
            style={[styles.segment, segment === 'consumption' && styles.segmentActive]}
            onPress={() => setSegment('consumption')}>
            <Text style={[styles.segmentText, segment === 'consumption' && styles.segmentTextActive]}>Consumption</Text>
          </Pressable>
          <Pressable
            style={[styles.segment, segment === 'roomNights' && styles.segmentActive]}
            onPress={() => setSegment('roomNights')}>
            <Text style={[styles.segmentText, segment === 'roomNights' && styles.segmentTextActive]}>Room Nights</Text>
          </Pressable>
        </View>
      }>
      {isLoading ? (
        <ActivityIndicator color={colors.navy} style={styles.loading} />
      ) : isError || !data || !activeMetric ? (
        <Text style={styles.errorText}>{error?.message ?? 'Could not load this report.'}</Text>
      ) : (
        <>
          <StatsDonutCard
            title={segment === 'consumption' ? 'Revenue by channel' : 'Room nights by channel'}
            centerValue={segment === 'consumption' ? formatCompactNumber(activeMetric.totals.total) : String(activeMetric.totals.total)}
            centerLabel={segment === 'consumption' ? 'TOTAL NGN' : 'NIGHTS'}
            items={activeMetric.breakdown.map((b, i) => ({
              label: channelLabel(b.key),
              value: b.amount,
              pct: b.pct,
              color: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
            }))}
          />

          {topChannel && (
            <View style={styles.topCard}>
              <View style={styles.topHeaderRow}>
                <Text style={styles.sectionTitle}>Top performing channel</Text>
                {topChannelDelta != null && (
                  <View style={styles.topDeltaBadge}>
                    <Text style={styles.topDeltaText}>
                      {topChannelDelta >= 0 ? '+' : ''}
                      {topChannelDelta}%
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.topRow}>
                <View style={styles.topIcon}>
                  <BuildingIcon />
                </View>
                <View>
                  <Text style={styles.topChannelName}>{channelLabel(topChannel.key)}</Text>
                  <Text style={styles.topChannelSub}>
                    {segment === 'consumption' ? formatNairaCompact(topChannel.amount) : `${topChannel.amount} room nights`}{' '}
                    {dateRange.label.toLowerCase()}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Room nights by channel</Text>
            <View style={styles.barList}>
              {data.roomNights.breakdown.map((b, i) => {
                const maxAmount = Math.max(1, ...data.roomNights.breakdown.map((x) => x.amount));
                return (
                  <View key={b.key} style={styles.barRow}>
                    <Text style={styles.barLabel} numberOfLines={1}>
                      {channelLabel(b.key)}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${(b.amount / maxAmount) * 100}%`, backgroundColor: CHANNEL_COLORS[i % CHANNEL_COLORS.length] },
                        ]}
                      />
                    </View>
                    <Text style={styles.barValue}>{b.amount}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </>
      )}
    </StatsReportShell>
  );
}

const styles = StyleSheet.create({
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: 11,
    padding: 4,
    marginBottom: 14,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  segmentActive: {
    backgroundColor: colors.navy,
  },
  segmentText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 18,
    gap: 14,
  },
  sectionTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 14.5,
    color: colors.navyInk,
  },
  topCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 18,
    gap: 14,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topDeltaBadge: {
    backgroundColor: colors.successSoft,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  topDeltaText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
    color: colors.success,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topChannelName: {
    fontFamily: fonts.headingBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  topChannelSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  barList: {
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barLabel: {
    width: 98,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.text,
  },
  barTrack: {
    flex: 1,
    height: 9,
    borderRadius: 999,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  barValue: {
    width: 26,
    textAlign: 'right',
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    color: colors.textMuted,
  },
});
