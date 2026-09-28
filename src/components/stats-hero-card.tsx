import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, fonts, radii } from '@/design/theme';

// Same gradient hero treatment as Home/Settings/Property Info — not in
// design/theme.ts since it's only ever used for this exact card shape.
const GRADIENT_START = '#3E52A3';

function TrendUpIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#7CE7B0" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 15l6-6 4 4 8-8" />
      <Path d="M18 5h4v4" />
    </Svg>
  );
}
function TrendDownIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#FFC2B8" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 9l6 6 4-4 8 8" />
      <Path d="M18 19h4v-4" />
    </Svg>
  );
}

// The gradient "hero" card at the top of Revenue/Transactions/Sales
// Revenue — a big total, an optional "vs previous period" delta (none of
// hms-backend-node's analytics endpoints compute one, so every screen that
// shows this fetches the prior period itself and passes the result in),
// and an optional itemized breakdown list.
export function StatsHeroCard({
  eyebrow,
  total,
  totalSub,
  deltaPct,
  deltaCaption,
  items,
}: {
  eyebrow: string;
  total: string;
  totalSub?: string;
  deltaPct?: number | null;
  deltaCaption?: string;
  items?: { icon: ReactNode; label: string; value: string }[];
}) {
  return (
    <LinearGradient colors={[GRADIENT_START, colors.navy]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <Svg width={130} height={130} viewBox="0 0 120 120" style={styles.ring}>
        <Circle cx={60} cy={60} r={60} fill="#5A6BC0" />
      </Svg>

      <View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <View style={styles.totalRow}>
          <Text style={styles.total}>{total}</Text>
          {!!totalSub && <Text style={styles.totalSub}>{totalSub}</Text>}
        </View>
        {deltaPct != null && (
          <View style={styles.deltaRow}>
            {deltaPct >= 0 ? <TrendUpIcon /> : <TrendDownIcon />}
            <Text style={[styles.deltaText, { color: deltaPct >= 0 ? '#7CE7B0' : '#FFC2B8' }]}>
              {deltaPct >= 0 ? '+' : ''}
              {deltaPct}% {deltaCaption}
            </Text>
          </View>
        )}
      </View>

      {!!items?.length && (
        <View style={styles.itemsWrap}>
          {items.map((item, i) => (
            <View key={item.label} style={[styles.itemRow, i < items.length - 1 && styles.itemRowDivider]}>
              <View style={styles.itemIcon}>{item.icon}</View>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    padding: 20,
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    top: -44,
    right: -34,
    opacity: 0.22,
  },
  eyebrow: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: '#C4CBEE',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 6,
  },
  total: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 30,
    color: '#FFFFFF',
  },
  totalSub: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
    color: '#C4CBEE',
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  deltaText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  itemsWrap: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.16)',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
  },
  itemRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    flex: 1,
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
    color: '#E4E7F7',
  },
  itemValue: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
});
