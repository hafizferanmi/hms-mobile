import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors, fonts, radii } from '@/design/theme';

type IconProps = { color: string };

function RevenueIcon({ color }: IconProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 17l6-6 4 4 8-8" />
      <Path d="M21 7v6h-6" />
    </Svg>
  );
}

function TransactionsIcon({ color }: IconProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={4} width={16} height={16} rx={2} />
      <Path d="M8 9h8M8 13h5" />
    </Svg>
  );
}

function ChannelIcon({ color }: IconProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={6} cy={12} r={3} />
      <Circle cx={18} cy={6} r={3} />
      <Circle cx={18} cy={18} r={3} />
      <Path d="M8.7 10.7l6.6-3.4M8.7 13.3l6.6 3.4" />
    </Svg>
  );
}

function SalesRevenueIcon({ color }: IconProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2a10 10 0 1 0 10 10H12z" />
      <Path d="M12 2a10 10 0 0 1 10 10" />
    </Svg>
  );
}

function MetricsIcon({ color }: IconProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 17l5-5 4 4 9-9" />
    </Svg>
  );
}

function QuickNoteIcon({ color }: IconProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Svg>
  );
}

const TILES: {
  key: string;
  label: string;
  chipColor: string;
  icon: (props: IconProps) => React.JSX.Element;
  iconColor: string;
  route: string | null;
}[] = [
  { key: 'revenue', label: 'Revenue', chipColor: colors.amberSoft, icon: RevenueIcon, iconColor: colors.amber, route: '/stats/revenue' },
  {
    key: 'transactions',
    label: 'Transactions',
    chipColor: colors.navySoft,
    icon: TransactionsIcon,
    iconColor: colors.navy,
    route: '/stats/transactions',
  },
  { key: 'channel', label: 'Channel', chipColor: colors.purpleSoft, icon: ChannelIcon, iconColor: colors.purple, route: '/stats/channel' },
  {
    key: 'sales-revenue',
    label: 'Sales Revenue',
    chipColor: colors.coralSoft,
    icon: SalesRevenueIcon,
    iconColor: colors.coral,
    route: '/stats/sales-revenue',
  },
  { key: 'metrics', label: 'Metrics', chipColor: colors.navySoft, icon: MetricsIcon, iconColor: colors.navy, route: '/stats/metrics' },
  // Per FLOW.md, Quick Note is a separate, unrelated feature with no
  // mockup yet — stays inert (matches the web app too, where it's a
  // disabled "Coming soon" menu entry).
  { key: 'quick-note', label: 'Quick Note', chipColor: colors.successSoft, icon: QuickNoteIcon, iconColor: colors.success, route: null },
];

// This week's bar chart — matches design/design-reference/Statistics.html's
// static bar heights exactly (percentages of the 80px chart row).
const WEEK_BARS = [35, 55, 90, 42, 66, 28, 48];

export default function StatisticsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Statistics</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.tileCard}>
          {TILES.map((tile) => (
            <Pressable
              key={tile.key}
              style={styles.tile}
              onPress={() => tile.route && router.push(tile.route as never)}>
              <View style={[styles.tileIcon, { backgroundColor: tile.chipColor }]}>
                <tile.icon color={tile.iconColor} />
              </View>
              <Text style={styles.tileLabel}>{tile.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>This week</Text>
          <View style={styles.chartRow}>
            {WEEK_BARS.map((height, i) => (
              <View key={i} style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height: `${height}%`, backgroundColor: i === 2 ? colors.navy : colors.navySoft },
                  ]}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 19,
    color: colors.navyInk,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  tileCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    paddingVertical: 26,
    paddingHorizontal: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 26,
  },
  tile: {
    width: '33.33%',
    alignItems: 'center',
    gap: 9,
  },
  tileIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
  },
  chartCard: {
    marginTop: 18,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 18,
    gap: 14,
  },
  chartTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 14.5,
    color: colors.navyInk,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 80,
  },
  barTrack: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
});
