import { PieChart } from 'react-native-gifted-charts';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii } from '@/design/theme';

// The donut+legend layout every report screen's category/method/channel
// breakdown card uses (Revenue by category, By payment method, Revenue by
// channel, Sales by category) — same visual shape, just different data and
// colors per screen.
export function StatsDonutCard({
  title,
  centerValue,
  centerLabel,
  items,
}: {
  title: string;
  centerValue: string;
  centerLabel: string;
  items: { label: string; value: number; pct: number; color: string }[];
}) {
  const pieData = items.map((item) => ({ value: item.value || 0.0001, color: item.color }));

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.row}>
        <View style={styles.chartWrap}>
          <PieChart
            data={pieData}
            donut
            radius={52}
            innerRadius={38}
            innerCircleColor={colors.surface}
            centerLabelComponent={() => (
              <View style={styles.centerLabel}>
                <Text style={styles.centerValue}>{centerValue}</Text>
                <Text style={styles.centerCaption}>{centerLabel}</Text>
              </View>
            )}
          />
        </View>
        <View style={styles.legend}>
          {items.map((item) => (
            <View key={item.label} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.legendPct}>{Math.round(item.pct)}%</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 18,
    gap: 16,
  },
  sectionTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 14.5,
    color: colors.navyInk,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  chartWrap: {
    flexShrink: 0,
  },
  centerLabel: {
    alignItems: 'center',
  },
  centerValue: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 16,
    color: colors.navyInk,
  },
  centerCaption: {
    fontFamily: fonts.bodySemibold,
    fontSize: 9,
    color: colors.textFaint,
    marginTop: 2,
  },
  legend: {
    flex: 1,
    gap: 11,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 3,
    flexShrink: 0,
  },
  legendLabel: {
    flex: 1,
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
    color: colors.text,
  },
  legendPct: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
    color: colors.textFaint,
    width: 32,
    textAlign: 'right',
  },
});
