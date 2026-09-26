import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { colors, fonts, radii } from "@/design/theme";
import { countryName } from "@/constants/countries";
import { useCompany } from "@/hooks/use-company";

// -----------------------------------------------------------------------
// PropertyInfo.html — read-only, pulled from GET /staffs/me's `company`
// (see src/api/company.ts; there's no dedicated GET /settings endpoint).
// The pencils on "Company details" and "Policies" (and the gradient
// header card's own pencil) all open company-settings.tsx; "View full
// terms" opens edit-policies.tsx too, rather than inventing a fourth,
// read-only "full terms" screen the mockups never specced — that screen
// already shows the complete terms text in an editable field.
// -----------------------------------------------------------------------

function BackIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.text}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function PencilIcon({
  color = colors.navy,
  size = 13,
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
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Svg>
  );
}
function BuildingIcon() {
  return (
    <Svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.navy}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M3 21h18M6 21V7l6-4 6 4v14M9 21v-6h6v6" />
    </Svg>
  );
}
function GlobeIcon() {
  return (
    <Svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.navy}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx={12} cy={12} r={9} />
      <Path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </Svg>
  );
}
function PhoneIcon() {
  return (
    <Svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.navy}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 3a2 2 0 0 1-.5 2.1L8 10.1a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 2 .5 3 .7a2 2 0 0 1 1.6 2z" />
    </Svg>
  );
}
function ShieldIcon() {
  return (
    <Svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.navy}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 2 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6z" />
    </Svg>
  );
}
function ChevronRightIcon() {
  return (
    <Svg
      width={10}
      height={10}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.navy}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  onEdit,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHead}>
        <View style={styles.infoRow}>
          <View style={styles.sectionIconTile}>{icon}</View>
          <View>
            <Text style={styles.sectionTitle}>{title}</Text>
            {!!subtitle && (
              <Text style={styles.sectionSubtitle}>{subtitle}</Text>
            )}
          </View>
        </View>
        {onEdit && (
          <Pressable style={styles.editButton} onPress={onEdit} hitSlop={8}>
            <PencilIcon />
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function formatChildPolicy(age: number | null | undefined) {
  return age ? `Free under ${age}` : "No free admission";
}

export default function PropertyInfoScreen() {
  const { data: company, isLoading, isError, error, refetch, isRefetching } = useCompany();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackIcon />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Property Info</Text>
          <Text style={styles.headerSubtitle}>Your company profile</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.navy} />
        </View>
      ) : isError ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateErrorText}>{error.message}</Text>
        </View>
      ) : !company ? null : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.navy} />
          }
        >
          <LinearGradient
            colors={["#3E52A3", colors.navy]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <Svg
              width={120}
              height={120}
              viewBox="0 0 120 120"
              style={styles.heroRing}
            >
              <Circle cx={60} cy={60} r={60} fill="#5A6BC0" />
            </Svg>
            <View style={styles.heroRow}>
              <View style={styles.heroLeft}>
                <View style={styles.heroAvatar}>
                  <Text style={styles.heroAvatarText}>
                    {getInitials(company.name)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.heroName}>{company.name}</Text>
                  <Text style={styles.heroMeta}>
                    {countryName(company.country) ?? "—"} ·{" "}
                    {company.currency ?? "—"}
                  </Text>
                </View>
              </View>
              <Pressable
                style={styles.heroEditButton}
                onPress={() => router.push("/company-settings")}
                hitSlop={8}
              >
                <PencilIcon color="#FFFFFF" size={14} />
              </Pressable>
            </View>
          </LinearGradient>

          <SectionCard
            icon={<BuildingIcon />}
            title="Company details"
            onEdit={() => router.push("/company-settings")}
          >
            <View style={styles.fieldStack}>
              <View>
                <Text style={styles.fieldLabel}>COMPANY NAME</Text>
                <Text style={styles.fieldValue}>{company.name}</Text>
              </View>
              <View>
                <Text style={styles.fieldLabel}>COMPANY ADDRESS</Text>
                <Text style={[styles.fieldValue, styles.fieldValueWrap]}>
                  {company.address || "Not set"}
                </Text>
              </View>
            </View>
          </SectionCard>

          <SectionCard icon={<GlobeIcon />} title="Regional">
            <View style={styles.triCellRow}>
              <View style={[styles.triCell, styles.triCellDivider]}>
                <Text style={styles.fieldLabel}>COUNTRY</Text>
                <Text style={[styles.fieldValue, styles.triCellValue]}>
                  {countryName(company.country) ?? "—"}
                </Text>
              </View>
              <View style={[styles.triCell, styles.triCellDivider]}>
                <Text style={styles.fieldLabel}>CURRENCY</Text>
                <Text style={[styles.fieldValue, styles.triCellValue]}>
                  {company.currency ?? "—"}
                </Text>
              </View>
              <View style={styles.triCell}>
                <Text style={styles.fieldLabel}>
                  {(company.taxLabel || "TAX").toUpperCase()}
                </Text>
                <Text style={[styles.fieldValue, styles.triCellValue]}>
                  {company.taxRate ?? 0}%
                </Text>
              </View>
            </View>
          </SectionCard>

          <SectionCard icon={<PhoneIcon />} title="Contact">
            <View style={styles.fieldStack}>
              <View>
                <Text style={styles.fieldLabel}>COMPANY EMAIL</Text>
                <Text style={[styles.fieldValue, styles.fieldValueWrap]}>
                  {company.email || "Not set"}
                </Text>
              </View>
              <View>
                <Text style={styles.fieldLabel}>COMPANY PHONE</Text>
                <Text style={styles.fieldValue}>
                  {company.phone || "Not set"}
                </Text>
              </View>
              <View>
                <Text style={styles.fieldLabel}>COMPANY WEBSITE</Text>
                <Text
                  style={[
                    styles.fieldValue,
                    styles.fieldValueWrap,
                    styles.linkValue,
                  ]}
                >
                  {company.website || "Not set"}
                </Text>
              </View>
            </View>
          </SectionCard>

          <SectionCard
            icon={<ShieldIcon />}
            title="Policies"
            subtitle="House rules shown to your front desk team"
            onEdit={() => router.push("/edit-policies")}
          >
            <View style={styles.triCellRow}>
              <View style={[styles.triCell, styles.triCellDivider]}>
                <Text style={styles.fieldLabel}>CHECK-IN</Text>
                <Text style={[styles.fieldValue, styles.triCellValue]}>
                  {company.checkInTime || "—"}
                </Text>
              </View>
              <View style={[styles.triCell, styles.triCellDivider]}>
                <Text style={styles.fieldLabel}>CHECK-OUT</Text>
                <Text style={[styles.fieldValue, styles.triCellValue]}>
                  {company.checkOutTime || "—"}
                </Text>
              </View>
              <View style={[styles.triCell, { flex: 1.3 }]}>
                <Text style={styles.fieldLabel}>CHILDREN</Text>
                <Text
                  style={[
                    styles.fieldValue,
                    styles.triCellValue,
                    styles.smallValue,
                  ]}
                >
                  {formatChildPolicy(company.childFreeAge)}
                </Text>
              </View>
            </View>

            <View style={styles.pillRow}>
              <View style={styles.pillCard}>
                <Text style={styles.pillLabel}>Smoking</Text>
                <View
                  style={[
                    styles.pill,
                    company.smokingAllowed
                      ? styles.pillAllowed
                      : styles.pillNotAllowed,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      company.smokingAllowed
                        ? styles.pillTextAllowed
                        : styles.pillTextNotAllowed,
                    ]}
                  >
                    {company.smokingAllowed ? "Allowed" : "Not allowed"}
                  </Text>
                </View>
              </View>
              <View style={styles.pillCard}>
                <Text style={styles.pillLabel}>Pets</Text>
                <View
                  style={[
                    styles.pill,
                    company.petsAllowed
                      ? styles.pillAllowed
                      : styles.pillNotAllowed,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      company.petsAllowed
                        ? styles.pillTextAllowed
                        : styles.pillTextNotAllowed,
                    ]}
                  >
                    {company.petsAllowed ? "Allowed" : "Not allowed"}
                  </Text>
                </View>
              </View>
            </View>

            <View>
              <Text style={styles.fieldLabel}>ADDITIONAL RULES</Text>
              <Text style={styles.bodyText}>
                {company.additionalRules || "None set"}
              </Text>
            </View>

            <View style={styles.divider} />

            <View>
              <Text style={styles.fieldLabel}>TERMS AND CONDITIONS</Text>
              <Text style={styles.bodyTextMuted} numberOfLines={3}>
                {company.termsAndConditions || "Not set yet"}
              </Text>
              <Pressable
                style={styles.viewTermsLink}
                onPress={() => router.push("/edit-policies")}
              >
                <Text style={styles.viewTermsText}>View full terms</Text>
                <ChevronRightIcon />
              </Pressable>
            </View>
          </SectionCard>
        </ScrollView>
      )}
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
    backgroundColor: colors.surface,
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 18,
    color: colors.navyInk,
  },
  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  stateBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stateErrorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.danger,
    textAlign: "center",
    paddingHorizontal: 30,
  },
  body: {
    padding: 20,
    gap: 14,
  },
  heroCard: {
    borderRadius: radii.card,
    padding: 20,
    overflow: "hidden",
  },
  heroRing: {
    position: "absolute",
    top: -40,
    right: -30,
    opacity: 0.2,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flexShrink: 1,
  },
  heroAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1.4,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroAvatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: "#FFFFFF",
  },
  heroName: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 19,
    color: "#FFFFFF",
  },
  heroMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "#C4CBEE",
    marginTop: 3,
  },
  heroEditButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 16,
    gap: 14,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  sectionIconTile: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.navySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 14.5,
    color: colors.navyInk,
  },
  sectionSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 2,
  },
  editButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.navySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fieldStack: {
    gap: 12,
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 9.5,
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontFamily: fonts.headingBold,
    fontSize: 13.5,
    color: colors.navyInk,
    marginTop: 3,
  },
  fieldValueWrap: {
    fontSize: 13,
  },
  linkValue: {
    color: colors.navy,
  },
  triCellRow: {
    flexDirection: "row",
    backgroundColor: colors.bg,
    borderRadius: 12,
    overflow: "hidden",
  },
  triCell: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  triCellDivider: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  triCellValue: {
    marginTop: 4,
  },
  smallValue: {
    fontSize: 12,
  },
  pillRow: {
    flexDirection: "row",
    gap: 10,
  },
  pillCard: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pillLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  pill: {
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  pillAllowed: {
    backgroundColor: colors.successSoft,
  },
  pillNotAllowed: {
    backgroundColor: colors.dangerSoft,
  },
  pillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  pillTextAllowed: {
    color: colors.success,
  },
  pillTextNotAllowed: {
    color: colors.danger,
  },
  bodyText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.text,
    marginTop: 4,
    lineHeight: 18,
  },
  bodyTextMuted: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  viewTermsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  viewTermsText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.navy,
  },
});
