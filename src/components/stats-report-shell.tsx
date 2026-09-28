import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { StatsDateRangeSheet } from '@/components/stats-date-range-sheet';
import { StatsExplanationSheet } from '@/components/stats-explanation-sheet';
import { StatsSwitchReportSheet } from '@/components/stats-switch-report-sheet';
import type { StatsReportKey } from '@/constants/stats-reports';
import { colors, fonts } from '@/design/theme';
import type { StatsDateRange } from '@/utils/stats-date-range';

// Shared chrome for every screen under src/app/stats/: back + title (tap
// to switch report) + date pill + Explanation link, the scrollable body,
// and the "log in on desktop" footer note every one of the 5 mockups
// repeats verbatim. Each screen only supplies its own report-specific
// content (hero card, charts) as `children`, plus its methodology copy
// for the Explanation sheet.

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function ChevronDownIcon({ color = colors.textMuted, size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}
function CalendarIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={16} rx={2} />
      <Path d="M3 10h18" />
      <Path d="M8 3v4" />
      <Path d="M16 3v4" />
    </Svg>
  );
}
function InfoIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2.2}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 16v-5" strokeLinecap="round" />
      <Circle cx={12} cy={8.2} r={0.9} fill={colors.textFaint} stroke="none" />
    </Svg>
  );
}

export function StatsReportShell({
  reportKey,
  title,
  dateRange,
  onApplyDateRange,
  explanationBullets,
  headerExtra,
  refreshing,
  onRefresh,
  children,
}: {
  reportKey: StatsReportKey;
  title: string;
  dateRange: StatsDateRange;
  onApplyDateRange: (range: StatsDateRange) => void;
  explanationBullets: string[];
  headerExtra?: ReactNode;
  refreshing: boolean;
  onRefresh: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.titleRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <BackIcon />
          </Pressable>
          <Pressable style={styles.titlePress} onPress={() => setSwitchOpen(true)}>
            <Text style={styles.title}>{title}</Text>
            <ChevronDownIcon />
          </Pressable>
        </View>

        {headerExtra}

        <View style={styles.controlsRow}>
          <Pressable style={styles.datePill} onPress={() => setDateSheetOpen(true)}>
            <CalendarIcon />
            <Text style={styles.datePillText}>{dateRange.label}</Text>
            <ChevronDownIcon color={colors.navy} size={11} />
          </Pressable>
          <Pressable style={styles.explanationLink} onPress={() => setExplanationOpen(true)}>
            <InfoIcon />
            <Text style={styles.explanationText}>Explanation</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} colors={[colors.navy]} />}>
        {children}
        <Text style={styles.footerNote}>For more detailed reports, please log in on desktop</Text>
      </ScrollView>

      <StatsDateRangeSheet
        visible={dateSheetOpen}
        applied={dateRange}
        onClose={() => setDateSheetOpen(false)}
        onApply={(range) => {
          onApplyDateRange(range);
          setDateSheetOpen(false);
        }}
      />
      <StatsExplanationSheet visible={explanationOpen} onClose={() => setExplanationOpen(false)} bullets={explanationBullets} />
      <StatsSwitchReportSheet visible={switchOpen} current={reportKey} onClose={() => setSwitchOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  titlePress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  title: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 19,
    color: colors.navyInk,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.navySoft,
    borderRadius: 9,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  datePillText: {
    fontFamily: fonts.headingBold,
    fontSize: 13,
    color: colors.navy,
  },
  explanationLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  explanationText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 26,
    gap: 16,
  },
  footerNote: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: 11,
    color: colors.textFaint,
  },
});
