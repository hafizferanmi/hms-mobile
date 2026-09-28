import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { SwitchPropertySheet } from "@/components/switch-property-sheet";
import { colors, fonts, radii } from "@/design/theme";
import { useCompany } from "@/hooks/use-company";
import { useSession } from "@/hooks/use-session";

// One-off colors lifted straight from design/design-reference/Settings.html —
// same header gradient treatment as Home's, not in design/theme.ts.
const DECORATIVE = {
  gradientStart: "#3E52A3",
  headerCircle: "#5A6BC0",
  linkMuted: "#D6DBF5",
  validityMuted: "#C4CBEE",
  chipBg: "rgba(255,255,255,0.18)",
  chipBgStrong: "rgba(255,255,255,0.16)",
};

function ChevronRightIcon({
  color = colors.textFaint,
  size = 16,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M9 5l7 7-7 7" />
    </Svg>
  );
}

function ProfileIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill={colors.navy}>
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </Svg>
  );
}

function LogOutIcon() {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.coral}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Path d="M16 17l5-5-5-5" />
      <Path d="M21 12H9" />
    </Svg>
  );
}

function SettingsRow({
  label,
  value,
  onPress,
  showDivider,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  showDivider?: boolean;
}) {
  return (
    <>
      <Pressable style={styles.row} onPress={onPress}>
        <Text style={styles.rowLabel}>{label}</Text>
        <View style={styles.rowRight}>
          {value && <Text style={styles.rowValue}>{value}</Text>}
          <ChevronRightIcon />
        </View>
      </Pressable>
      {showDivider && <View style={styles.divider} />}
    </>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { session, signOut } = useSession();
  const { data: company } = useCompany();
  const [switchSheetOpen, setSwitchSheetOpen] = useState(false);
  const propertyName = company?.name ?? "Property";

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.push("/account")}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <ProfileIcon />
            </View>
            <View style={styles.profileText}>
              <Text style={styles.profileName}>{session?.staff.name}</Text>
              <Text style={styles.profileEmail}>{session?.staff.email}</Text>
            </View>
          </View>
        </Pressable>

        <LinearGradient
          colors={[DECORATIVE.gradientStart, colors.navy]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.propertyCard}
        >
          <Svg
            width={120}
            height={120}
            viewBox="0 0 120 120"
            style={styles.propertyRing}
          >
            <Circle cx={60} cy={60} r={60} fill={DECORATIVE.headerCircle} />
          </Svg>

          <View style={styles.propertyHeaderRow}>
            <Text style={styles.propertyHeading}>Current Property</Text>
            <Pressable
              style={styles.switchPropertyLink}
              onPress={() => setSwitchSheetOpen(true)}
            >
              <Text style={styles.switchPropertyText}>Switch Property</Text>
              <ChevronRightIcon color={DECORATIVE.linkMuted} size={13} />
            </Pressable>
          </View>

          <View style={styles.propertyNameRow}>
            <Text style={styles.propertyName}>{propertyName}</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>FREE</Text>
            </View>
          </View>

          <View style={styles.propertyFooterRow}>
            <Text style={styles.propertyValidity}>Permanently Valid</Text>
            {/* TODO(billing): no upgrade/billing flow is specced yet. */}
            <Pressable style={styles.upgradeButton}>
              <Text style={styles.upgradeButtonText}>Upgrade</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* Rate Plan/Hourly Room/Combined Room still have no design
            handoff — left inert. Room Type, Staff & Roles, and now
            Property Info are real. */}
        <View style={styles.card}>
          <SettingsRow label="Rate Plan" onPress={() => {}} showDivider />
          <SettingsRow
            label="Rooms"
            onPress={() => router.push("/room-types")}
            showDivider
          />
          {/* <SettingsRow label="Hourly Room" onPress={() => {}} showDivider />
          <SettingsRow label="Combined Room" onPress={() => {}} showDivider />
          <SettingsRow
            label="Property Info"
            onPress={() => router.push("/property-info")}
          /> */}
        </View>

        {/* "Staff" was "Accounts" in the mockup — renamed since it opens
            this staff member's own profile/password settings
            (account.tsx), distinct from "Staff & Roles" above it (that
            one manages the whole company's staff roster). */}
        <View style={styles.card}>
          <SettingsRow
            label="Staffs"
            onPress={() => router.push("/staff-roles")}
          />
        </View>

        <View style={styles.card}>
          <SettingsRow
            label="Email templates"
            onPress={() => router.push("/staff-roles")}
            showDivider
          />
          <SettingsRow
            label="Custom fields"
            onPress={() => router.push("/custom-fields")}
          />
        </View>

        <View style={styles.card}>
          <SettingsRow label="Language" value="English" onPress={() => {}} />
        </View>

        <Pressable style={styles.logoutRow} onPress={() => signOut()}>
          <LogOutIcon />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>

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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.navySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  profileText: {
    gap: 2,
  },
  profileName: {
    fontFamily: fonts.headingBold,
    fontSize: 15.5,
    color: colors.navyInk,
  },
  profileEmail: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  propertyCard: {
    marginTop: 20,
    borderRadius: radii.card,
    padding: 18,
    overflow: "hidden",
  },
  propertyRing: {
    position: "absolute",
    bottom: -40,
    right: -30,
    opacity: 0.25,
  },
  propertyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  propertyHeading: {
    fontFamily: fonts.headingBold,
    fontSize: 14.5,
    color: "#FFFFFF",
  },
  switchPropertyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  switchPropertyText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
    color: DECORATIVE.linkMuted,
  },
  propertyNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  propertyName: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 18,
    color: "#FFFFFF",
  },
  planBadge: {
    backgroundColor: DECORATIVE.chipBg,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  planBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
    color: "#FFFFFF",
  },
  propertyFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  propertyValidity: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: DECORATIVE.validityMuted,
  },
  upgradeButton: {
    backgroundColor: DECORATIVE.chipBgStrong,
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  upgradeButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: "#FFFFFF",
  },
  card: {
    marginTop: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  rowLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14.5,
    color: colors.text,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowValue: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  logoutRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  logoutText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.coral,
  },
});
