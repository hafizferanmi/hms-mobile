import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, fonts, radii } from '@/design/theme';

// -----------------------------------------------------------------------
// Home's Quick Actions "More" tile used to be inert; it now opens this
// screen. Reports moved here from Home's Quick Actions grid (which is back
// down to 3 tiles as a result — worth a look to see if that still reads
// well spaced, or wants rebalancing). This tile grid is meant to grow —
// add more entries to MORE_TILES as new destinations come in, no other
// changes needed. Lost & Found is the first tile that actually goes
// somewhere.
// -----------------------------------------------------------------------

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function ReportsIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 19V9" />
      <Path d="M12 19V4" />
      <Path d="M20 19v-7" />
    </Svg>
  );
}

function LostAndFoundIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2 2 12l9 9 11-11V2z" />
      <Circle cx={7} cy={7} r={1.5} />
    </Svg>
  );
}

function ReviewsIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.1 6.1-.6z" />
    </Svg>
  );
}

function GuestsIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={8} r={3.5} />
      <Path d="M2 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
      <Path d="M16.5 8a3 3 0 1 1 3.6 4.4M22 20c0-2.6-1.8-4.6-4.5-5.4" />
    </Svg>
  );
}

function MaintenanceIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14.7 6.3a4 4 0 0 0-5.6 5.6L3 18l3 3 6.1-6.1a4 4 0 0 0 5.6-5.6l-2.8 2.8-2-2z" />
    </Svg>
  );
}

type MoreTile = {
  key: string;
  label: string;
  chipColor: string;
  iconColor: string;
  icon: (color: string) => React.ReactNode;
  onPress: () => void;
};

const MORE_TILES: MoreTile[] = [
  {
    key: 'guests',
    label: 'Guest List',
    chipColor: colors.purpleSoft,
    iconColor: colors.purple,
    icon: (color) => <GuestsIcon color={color} />,
    onPress: () => router.push('/guests'),
  },
  {
    key: 'lost-and-found',
    label: 'Lost & Found',
    chipColor: colors.slateSoft,
    iconColor: colors.slate,
    icon: (color) => <LostAndFoundIcon color={color} />,
    onPress: () => router.push('/lost-and-found'),
  },
  {
    key: 'reviews',
    label: 'Reviews',
    chipColor: colors.amberSoft,
    iconColor: colors.amber,
    icon: (color) => <ReviewsIcon color={color} />,
    onPress: () => router.push('/reviews'),
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    chipColor: colors.navySoft,
    iconColor: colors.navy,
    icon: (color) => <MaintenanceIcon color={color} />,
    onPress: () => router.push('/maintenance'),
  },
  // TODO(nav): Reports doesn't have a destination screen designed yet, so
  // it's inert for now, same as it was on Home.
  {
    key: 'reports',
    label: 'Reports',
    chipColor: colors.coralSoft,
    iconColor: colors.coral,
    icon: (color) => <ReportsIcon color={color} />,
    onPress: () => {},
  },
];

export default function MoreScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackIcon />
        </Pressable>
        <Text style={styles.title}>More</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {MORE_TILES.map((tile) => (
            <Pressable key={tile.key} style={styles.tile} onPress={tile.onPress}>
              <View style={[styles.tileIcon, { backgroundColor: tile.chipColor }]}>
                {tile.icon(tile.iconColor)}
              </View>
              <Text style={styles.tileLabel}>{tile.label}</Text>
            </Pressable>
          ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 17,
    color: colors.navyInk,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  grid: {
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
});
