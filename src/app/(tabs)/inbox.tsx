import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, fonts } from '@/design/theme';

type InboxTab = 'reservation' | 'system';

const TABS: { key: InboxTab; label: string }[] = [
  { key: 'reservation', label: 'Reservation' },
  { key: 'system', label: 'System' },
];

function ClearIcon() {
  return (
    <Svg
      width={19}
      height={19}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.textMuted}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round">
      <Path d="M20 20H8l-5-5a2 2 0 0 1 0-2.8L14.2 3a2 2 0 0 1 2.8 0l5 5a2 2 0 0 1 0 2.8L12 20" />
      <Path d="M9 12l6 6" />
    </Svg>
  );
}

function BellIllustration() {
  return (
    <View style={styles.emptyBadge}>
      <Svg width={30} height={30} viewBox="0 0 24 24" style={styles.emptyBadgeDots}>
        <Circle cx={4} cy={4} r={2} fill={colors.purple} />
        <Circle cx={14} cy={1} r={1.4} fill={colors.navy} />
      </Svg>
      <Svg
        width={50}
        height={50}
        viewBox="0 0 24 24"
        fill="none"
        stroke={colors.coral}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round">
        <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <Path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </Svg>
    </View>
  );
}

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<InboxTab>('reservation');

  // TODO(data): both tabs are always empty — wire this up to a real
  // notifications feed once the mobile app talks to hms-backend-node. The
  // "mark all read" icon in the header is inert for the same reason.
  const activeLabel = TABS.find((tab) => tab.key === activeTab)?.label ?? 'Reservation';

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Notifications</Text>
        <Pressable accessibilityLabel="Mark all as read" hitSlop={8}>
          <ClearIcon />
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Pressable key={tab.key} style={styles.tab} onPress={() => setActiveTab(tab.key)}>
              <Text style={active ? styles.tabLabelActive : styles.tabLabel}>{tab.label}</Text>
              {active && <View style={styles.tabIndicator} />}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.emptyState}>
        <BellIllustration />
        <View style={styles.emptyTextBlock}>
          <Text style={styles.emptyTitle}>You&apos;re all caught up</Text>
          <Text style={styles.emptySubtitle}>{activeLabel} alerts will appear here</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 19,
    color: colors.navyInk,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 26,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    paddingVertical: 10,
  },
  tabLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.textFaint,
  },
  tabLabelActive: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.navy,
  },
  tabIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 2.5,
    backgroundColor: colors.navy,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingBottom: 60,
  },
  emptyBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.coralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBadgeDots: {
    position: 'absolute',
    top: 6,
    right: 6,
    opacity: 0.55,
  },
  emptyTextBlock: {
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 15,
    color: colors.navyInk,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
});
