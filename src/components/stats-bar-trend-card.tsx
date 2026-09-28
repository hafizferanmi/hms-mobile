import { BarChart } from 'react-native-gifted-charts';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii } from '@/design/theme';

// Revenue's "Trend" and Transactions' "Transactions per day" cards — a
// plain per-day bar chart with the peak day highlighted navy (the rest
// navy-soft), matching both mockups' identical visual treatment. Labels
// are rendered as our own row below the chart (not gifted-charts' own
// x-axis) so long ranges (a month, "All time") can thin them out instead
// of overlapping.
export function StatsBarTrendCard({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: number }[];
}) {
  const maxValue = Math.max(0, ...items.map((i) => i.value));
  const barData = items.map((item) => ({
    value: item.value,
    frontColor: item.value === maxValue && maxValue > 0 ? colors.navy : colors.navySoft,
  }));

  // Beyond ~10 bars, showing every label crowds the row — thin to at most
  // 7 evenly-spaced labels, always keeping the first and last.
  const labelStep = Math.max(1, Math.ceil(items.length / 7));

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <BarChart
        data={barData}
        height={90}
        barWidth={items.length > 14 ? 8 : 22}
        spacing={items.length > 14 ? 6 : 14}
        roundedTop
        barBorderRadius={6}
        hideAxesAndRules
        hideYAxisText
        disableScroll={items.length <= 14}
        initialSpacing={8}
        endSpacing={8}
        isAnimated
      />
      <View style={styles.labelRow}>
        {items.map((item, i) => {
          const show = i === 0 || i === items.length - 1 || i % labelStep === 0;
          return (
            <Text key={i} style={[styles.label, item.value === maxValue && maxValue > 0 && styles.labelActive]} numberOfLines={1}>
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
  sectionTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 14.5,
    color: colors.navyInk,
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
  labelActive: {
    fontFamily: fonts.bodyBold,
    color: colors.navy,
  },
});
