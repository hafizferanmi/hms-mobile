import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, fonts, radii, shadow } from '@/design/theme';

type ResTab = 'arrivals' | 'arrived' | 'departures';

const TABS: { key: ResTab; label: string; emptyNoun: string }[] = [
  { key: 'arrivals', label: 'Arrivals', emptyNoun: 'Arriving' },
  { key: 'arrived', label: 'Arrived', emptyNoun: 'Arrived' },
  { key: 'departures', label: 'Departures', emptyNoun: 'Departing' },
];

const CHECK_IN_TYPES = ['All', 'Normal', 'Hourly Room'];
const ROOM_TYPES = ['All', 'CD', 'JD'];
const CHECK_IN_STATUSES = [
  'All',
  'Reserved',
  'Checked-in',
  'Canceled',
  'Checked-out',
  'Unpaid',
  'Pending',
  'Rejected',
];

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function SearchIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={11} cy={11} r={7} />
      <Path d="m21 21-4.3-4.3" />
    </Svg>
  );
}

function FilterIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 5h16l-6 8v6l-4-2v-4z" />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

function EmptyIllustration() {
  return (
    <View style={styles.emptyBadge}>
      <Svg width={30} height={30} viewBox="0 0 24 24" style={styles.emptyBadgeDots}>
        <Circle cx={4} cy={4} r={2} fill={colors.purple} />
        <Circle cx={14} cy={1} r={1.4} fill={colors.coral} />
      </Svg>
      <Svg width={58} height={50} viewBox="0 0 58 50">
        <Path
          d="M4 12h22l6 8h22a3 3 0 0 1 3 3v22a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3z"
          fill="#FFFFFF"
          stroke={colors.navy}
          strokeWidth={1.5}
        />
        <Path d="M1 15h56" stroke={colors.navy} strokeWidth={1.5} />
        <Circle cx={21} cy={32} r={2} fill={colors.navyInk} />
        <Circle cx={35} cy={32} r={2} fill={colors.navyInk} />
        <Path d="M22 40h12" stroke={colors.navyInk} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.pill, active ? styles.pillOn : styles.pillOff]}
      onPress={onPress}>
      <Text style={active ? styles.pillTextOn : styles.pillTextOff}>{label}</Text>
    </Pressable>
  );
}

function FilterGroup({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View>
      <Text style={styles.filterGroupTitle}>{title}</Text>
      <View style={styles.pillGrid}>
        {options.map((option) => (
          <FilterPill
            key={option}
            label={option}
            active={value === option}
            onPress={() => onChange(option)}
          />
        ))}
      </View>
    </View>
  );
}

export default function ReservationsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ResTab>('arrived');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const [checkInType, setCheckInType] = useState('All');
  const [roomType, setRoomType] = useState('All');
  const [checkInStatus, setCheckInStatus] = useState('All');

  function resetFilters() {
    setCheckInType('All');
    setRoomType('All');
    setCheckInStatus('All');
  }

  // TODO(data): all three tab counts are placeholders and the list below is
  // always empty — wire this up to hms-backend-node's checkIn/booking list
  // endpoint (and apply search + the filter selections above as query
  // params) once the mobile app talks to the API.
  const emptyNoun = TABS.find((tab) => tab.key === activeTab)?.emptyNoun ?? 'Arrived';

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackIcon />
        </Pressable>
        <View style={styles.searchWrapper}>
          <View pointerEvents="none" style={styles.searchIcon}>
            <SearchIcon />
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search guest, res no."
            placeholderTextColor={colors.textFaint}
            style={styles.searchInput}
          />
        </View>
        <Pressable style={styles.filterButton} onPress={() => setFilterOpen(true)}>
          <FilterIcon />
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Pressable key={tab.key} style={styles.tab} onPress={() => setActiveTab(tab.key)}>
              <Text style={active ? styles.tabLabelActive : styles.tabLabel}>
                {tab.label} <Text style={styles.tabCount}>(0)</Text>
              </Text>
              {active && <View style={styles.tabIndicator} />}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.emptyState}>
        <EmptyIllustration />
        <View style={styles.emptyTextBlock}>
          <Text style={styles.emptyTitle}>No reservations yet</Text>
          <Text style={styles.emptySubtitle}>{emptyNoun} guests will show up here</Text>
        </View>
      </View>

      {filterOpen && (
        <>
          <Pressable
            style={[StyleSheet.absoluteFill, styles.scrim]}
            onPress={() => setFilterOpen(false)}
            accessibilityLabel="Close filter"
          />
          <View style={styles.filterSheet}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter</Text>
              <Pressable onPress={() => setFilterOpen(false)} hitSlop={8}>
                <CloseIcon />
              </Pressable>
            </View>

            <ScrollView
              style={styles.filterBody}
              contentContainerStyle={styles.filterBodyContent}
              showsVerticalScrollIndicator={false}>
              <FilterGroup
                title="Check-in Type"
                options={CHECK_IN_TYPES}
                value={checkInType}
                onChange={setCheckInType}
              />
              <FilterGroup
                title="Room Type"
                options={ROOM_TYPES}
                value={roomType}
                onChange={setRoomType}
              />
              <FilterGroup
                title="Check-in Status"
                options={CHECK_IN_STATUSES}
                value={checkInStatus}
                onChange={setCheckInStatus}
              />
            </ScrollView>

            <View style={[styles.filterFooter, { paddingBottom: insets.bottom + 16 }]}>
              <Pressable style={styles.resetButton} onPress={resetFilters}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </Pressable>
              <Pressable style={styles.applyButton} onPress={() => setFilterOpen(false)}>
                <Text style={styles.applyButtonText}>Apply Filter</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
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
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  searchWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    backgroundColor: colors.bg,
    paddingLeft: 36,
    paddingRight: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: radii.input,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 22,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    paddingVertical: 10,
  },
  tabLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13.5,
    color: colors.textFaint,
  },
  tabLabelActive: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.navy,
  },
  tabCount: {
    color: colors.textFaint,
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
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBadgeDots: {
    position: 'absolute',
    top: 6,
    right: 6,
    opacity: 0.5,
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
  scrim: {
    backgroundColor: 'rgba(18,23,58,0.35)',
  },
  filterSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '78%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#12173A',
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  filterTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 18,
    color: colors.navyInk,
  },
  filterBody: {
    flexGrow: 0,
  },
  filterBodyContent: {
    paddingHorizontal: 20,
    gap: 22,
    paddingBottom: 12,
  },
  filterGroupTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 14,
    color: colors.navy,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  pill: {
    height: 42,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    flexBasis: '48%',
    flexGrow: 1,
  },
  pillOn: {
    backgroundColor: colors.navy,
  },
  pillOff: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillTextOn: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  pillTextOff: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13.5,
    color: colors.text,
  },
  filterFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resetButton: {
    flex: 1,
    height: 48,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14.5,
    color: colors.text,
  },
  applyButton: {
    flex: 2,
    height: 48,
    borderRadius: radii.input,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.button,
  },
  applyButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
});
