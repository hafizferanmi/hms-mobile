import { LineChart } from 'react-native-gifted-charts';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii } from '@/design/theme';

// Sales Revenue's "Sales trend" (coral) and Metrics' "Occupancy trend"
// (navy) cards — a smooth gradient area/line chart, deliberately different
// from Revenue/Transactions' bars for visual variety (per FLOW.md). Own
// label row below the chart, same reasoning as StatsBarTrendCard.
export function StatsAreaTrendCard({
  title,
  rightValue,
  items,
  color,
}: {
  title: string;
  rightValue?: string;
  items: { label: string; value: number }[];
  color: string;
}) {
  const lineData = items.map((item) => ({ value: item.value }));
  const labelStep = Math.max(1, Math.ceil(items.length / 7));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!rightValue && <Text style={[styles.rightValue, { color }]}>{rightValue}</Text>}
      </View>
      <LineChart
        data={lineData}
        height={100}
        curved
        areaChart
        color={color}
        thickness={3}
        startFillColor={color}
        endFillColor={color}
        startOpacity={0.28}
        endOpacity={0}
        hideDataPoints
        hideRules
        hideAxesAndRules
        hideYAxisText
        initialSpacing={0}
        endSpacing={0}
        adjustToWidth
        isAnimated
      />
      <View style={styles.labelRow}>
        {items.map((item, i) => {
          const show = i === 0 || i === items.length - 1 || i % labelStep === 0;
          return (
            <Text key={i} style={styles.label} numberOfLines={1}>
              {show ? item.label : ''}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 18,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 14.5,
    color: colors.navyInk,
  },
  rightValue: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 15,
  },
  labelRow: {
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.bodySemibold,
    fontSize: 9.5,
    color: colors.textFaint,
  },
});
