import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { SwitchPropertySheet } from "@/components/switch-property-sheet";
import { colors, fonts, radii, shadow } from "@/design/theme";
import { useCompany } from "@/hooks/use-company";

// One-off colors lifted straight from design/design-reference/Home.html /
// HomeAddMenu.html — not in design/theme.ts because they're only used for
// this screen's gradients, decorative circles and the AI promo card.
const DECORATIVE = {
  headerGradientStart: "#3E52A3",
  headerCircle: "#5A6BC0",
  revenueLabel: "#C4CBEE",
  star: "#F0B429",
  chipBg: "rgba(255,255,255,0.12)",
  chipBgStrong: "rgba(255,255,255,0.14)",
  blue: "#7C93FF",
  menuBg: colors.navyInk,
  menuDivider: "rgba(255,255,255,0.1)",
  scrim: "rgba(18,23,58,0.35)",
};

type IconProps = { color: string; size?: number };

function ChevronDownIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

function BellIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </Svg>
  );
}

function PlusIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

function MoreIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x={3} y={3} width={8} height={8} rx={2} />
      <Rect x={13} y={3} width={8} height={8} rx={2} />
      <Rect x={3} y={13} width={8} height={8} rx={2} />
      <Rect x={13} y={13} width={8} height={8} rx={2} />
    </Svg>
  );
}

function ReservationsIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x={4} y={10} width={16} height={10} rx={2} />
      <Path d="M9 10V7a3 3 0 0 1 6 0v3" />
    </Svg>
  );
}

function HousekeepingIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M4 20 14 10" />
      <Path d="M13 5l6 6-2 2-6-6z" />
    </Svg>
  );
}

// Same calendar-with-checkmark glyph as the "Check availability" header
// button on the Calendar tab, for visual consistency between the two
// entry points into that screen.
function AvailabilityIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x={3} y={5} width={18} height={16} rx={2} />
      <Path d="M3 10h18" />
      <Path d="M8 15l2.5 2.5L16 12" />
    </Svg>
  );
}

function QuickNoteIcon({ color, size = 15 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Svg>
  );
}

function AddPersonIcon({ color, size = 15 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </Svg>
  );
}

function MemoIcon({ color, size = 15 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <Path d="M9 12h6M9 16h6" />
    </Svg>
  );
}

function QuickActionTile({
  icon,
  label,
  chipColor,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  chipColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.qaTile} onPress={onPress}>
      <View style={[styles.qaIcon, { backgroundColor: chipColor }]}>
        {icon}
      </View>
      <Text style={styles.qaLabel}>{label}</Text>
    </Pressable>
  );
}

function QuickAddMenuItem({
  icon,
  iconBg,
  label,
  onPress,
  showDivider,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  onPress: () => void;
  showDivider: boolean;
}) {
  return (
    <Pressable
      style={[styles.menuItem, showDivider && styles.menuItemDivider]}
      onPress={onPress}
    >
      <View style={[styles.menuItemIcon, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <Text style={styles.menuItemLabel}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switchSheetOpen, setSwitchSheetOpen] = useState(false);
  const { data: company } = useCompany();
  const propertyName = company?.name ?? "Property";

  function closeMenu() {
    setMenuOpen(false);
  }

  // TODO(data): Today's Revenue and the Arriving/Departing/New counts below
  // are placeholders — wire these to hms-backend-node's dashboard stats
  // endpoint once the mobile app talks to the API.
  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[DECORATIVE.headerGradientStart, colors.navy]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <Svg
          width={180}
          height={180}
          viewBox="0 0 180 180"
          style={styles.headerRing}
        >
          <Circle cx={90} cy={90} r={90} fill={DECORATIVE.headerCircle} />
        </Svg>

        <View style={styles.headerRow}>
          <Pressable style={styles.workspacePill} onPress={() => setSwitchSheetOpen(true)}>
            <Text style={styles.workspaceName} numberOfLines={1}>
              {propertyName}
            </Text>
            <ChevronDownIcon color="#FFFFFF" />
          </Pressable>

          <View style={styles.headerActions}>
            <Pressable
              style={styles.headerIconButton}
              accessibilityLabel="Notifications"
              onPress={() => router.push('/notifications')}
            >
              <BellIcon color="#FFFFFF" />
            </Pressable>
            <Pressable
              style={styles.headerIconButton}
              accessibilityLabel="Quick add"
              onPress={() => setMenuOpen(true)}
            >
              <PlusIcon color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <View style={styles.revenueBlock}>
          <Text style={styles.revenueLabel}>Today&apos;s Revenue</Text>
          <Text style={styles.revenueAmount}>$200.00</Text>
          <View style={styles.pager}>
            <View style={styles.pagerDotActive} />
            <View style={styles.pagerDot} />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Per design/design-reference/reservations.md's Flow A, tapping
            a stat here is the dashboard's real entry point. */}
        <Pressable style={styles.statsCard} onPress={() => router.push('/reservations')}>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Arriving</Text>
            <Text style={[styles.statValue, { color: colors.amber }]}>0</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Departing</Text>
            <Text style={[styles.statValue, { color: colors.slate }]}>0</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>New</Text>
            <Text style={[styles.statValue, { color: colors.coral }]}>0</Text>
          </View>
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.qaCard}>
            <QuickActionTile
              icon={<MoreIcon color={colors.slate} />}
              chipColor={colors.slateSoft}
              label="More"
              onPress={() => router.push('/more')}
            />
            <QuickActionTile
              icon={<ReservationsIcon color={colors.purple} />}
              chipColor={colors.purpleSoft}
              label="Reservations"
              onPress={() => router.push('/reservations-list')}
            />
            <QuickActionTile
              icon={<HousekeepingIcon color={colors.amber} />}
              chipColor={colors.amberSoft}
              label="Housekeeping"
              onPress={() => router.push('/housekeeping')}
            />
            <QuickActionTile
              icon={<AvailabilityIcon color={colors.coral} />}
              chipColor={colors.coralSoft}
              label="Availability"
              onPress={() => router.push('/check-availability')}
            />
          </View>
        </View>

        {/* The "PMS AI Assistant" promo card used to sit here, linking to
            /ai-chat — removed now that AI Chat is its own bottom tab
            (app-tabs.tsx) rather than something to promote from Home.
            Deliberately left empty for now rather than filled with
            something else; a better use for this space can come later. */}
      </ScrollView>

      {/* Floats above the Quick Actions row — opens edit-guest.tsx in its
          create-new-reservation mode (no id param), same form Check
          Availability's "Continue" hands off to, just without pre-filled
          room/dates. */}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 84 }]}
        accessibilityLabel="New reservation"
        onPress={() => router.push('/edit-guest')}>
        <PlusIcon color="#FFFFFF" size={22} />
      </Pressable>

      {menuOpen && (
        <>
          <Pressable
            style={[StyleSheet.absoluteFill, styles.scrim]}
            onPress={closeMenu}
            accessibilityLabel="Close menu"
          />
          <View style={[styles.quickAddMenu, { top: insets.top + 60 }]}>
            <QuickAddMenuItem
              icon={<QuickNoteIcon color={colors.coral} />}
              iconBg="rgba(232,93,78,0.2)"
              label="Quick Note"
              showDivider
              onPress={closeMenu}
            />
            <QuickAddMenuItem
              icon={<AddPersonIcon color={DECORATIVE.blue} />}
              iconBg="rgba(124,147,255,0.2)"
              label="Add"
              showDivider
              onPress={closeMenu}
            />
            <QuickAddMenuItem
              icon={<MemoIcon color={DECORATIVE.star} />}
              iconBg="rgba(240,180,41,0.2)"
              label="Memo"
              showDivider={false}
              onPress={closeMenu}
            />
          </View>
        </>
      )}

      <SwitchPropertySheet
        visible={switchSheetOpen}
        onClose={() => setSwitchSheetOpen(false)}
        currentCompanyName={propertyName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexShrink: 0,
    paddingHorizontal: 24,
    paddingBottom: 36,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
  headerRing: {
    position: "absolute",
    top: -60,
    right: -50,
    opacity: 0.25,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  workspacePill: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    gap: 6,
    backgroundColor: DECORATIVE.chipBg,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  workspaceName: {
    fontFamily: fonts.headingBold,
    fontSize: 15,
    color: "#FFFFFF",
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DECORATIVE.chipBgStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  revenueBlock: {
    alignItems: "center",
    gap: 6,
    marginTop: 26,
  },
  revenueLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: DECORATIVE.revenueLabel,
  },
  revenueAmount: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 38,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  pager: {
    flexDirection: "row",
    gap: 5,
    marginTop: 6,
  },
  pagerDotActive: {
    width: 16,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  pagerDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    marginTop: 20,
    flexDirection: "row",
    paddingVertical: 18,
    paddingHorizontal: 8,
    ...shadow.card,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  statValue: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 20,
  },
  section: {
    marginTop: 22,
  },
  sectionTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 15,
    color: colors.navyInk,
  },
  qaCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    marginTop: 12,
    paddingVertical: 20,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  qaTile: {
    alignItems: "center",
    gap: 8,
    width: 72,
  },
  qaIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  qaLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11.5,
    color: colors.text,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.navy,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  scrim: {
    backgroundColor: DECORATIVE.scrim,
  },
  quickAddMenu: {
    position: "absolute",
    right: 20,
    width: 210,
    backgroundColor: DECORATIVE.menuBg,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: DECORATIVE.menuDivider,
  },
  menuItemIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
