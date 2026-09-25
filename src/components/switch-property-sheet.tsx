import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { getOrganizationCompanies, type OrganizationCompanyDto } from '@/api/organization';
import { switchMyCompany } from '@/api/account';
import { colors, fonts } from '@/design/theme';
import { useSession } from '@/hooks/use-session';

// SwitchProperty.html — the company list. NewCompany.html is its own
// route (see new-company.tsx) rather than a second view nested in here,
// since it has real text inputs that deserve full-screen keyboard
// handling. Shared between (tabs)/settings.tsx's "Switch Property" link
// and (tabs)/index.tsx's workspace pill — both entry points open the
// exact same sheet.
//
// There's no "reload the page" equivalent on mobile: switching a company
// re-persists the session's Staff (whose companyId just changed) and
// clears the entire query cache, since virtually every screen's data is
// company-scoped — same effect as the web app's window.location.reload()
// after switching (new-company.tsx does the same after creating one).

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const LOGO_COLORS = [colors.navy, colors.coral, colors.amber, colors.purple];

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function BuildingIcon({ color = colors.navy, size = 17 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 21h18M6 21V7l6-4 6 4v14M9 21v-6h6v6" />
    </Svg>
  );
}
function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function CheckIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}
function PlusIcon({ color = colors.navy, size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

function CompanyRow({
  company,
  index,
  pending,
  onPress,
}: {
  company: OrganizationCompanyDto;
  index: number;
  pending: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.companyRow, company.active && styles.companyRowActive]}
      disabled={company.active || pending}
      onPress={onPress}>
      <View style={[styles.companyLogo, { backgroundColor: LOGO_COLORS[index % LOGO_COLORS.length] }]}>
        <Text style={styles.companyLogoText}>{getInitials(company.name)}</Text>
      </View>
      <View style={styles.companyText}>
        <Text style={styles.companyName} numberOfLines={1}>
          {company.name}
        </Text>
        <Text style={styles.companySub} numberOfLines={1}>
          {[company.city, company.country].filter(Boolean).join(', ') || 'Location not set'} ·{' '}
          {company.roomCount} room{company.roomCount === 1 ? '' : 's'}
        </Text>
      </View>
      {company.active ? (
        <View style={styles.activeCheck}>
          <CheckIcon />
        </View>
      ) : (
        pending && <ActivityIndicator color={colors.navy} size="small" />
      )}
    </Pressable>
  );
}

export function SwitchPropertySheet({
  visible,
  onClose,
  currentCompanyName,
}: {
  visible: boolean;
  onClose: () => void;
  currentCompanyName: string;
}) {
  const insets = useSafeAreaInsets();
  const { session, signIn } = useSession();
  const queryClient = useQueryClient();

  const [switchingId, setSwitchingId] = useState<string | null>(null);

  // Not gated on `visible` — this component is mounted persistently by
  // both call sites (settings.tsx/index.tsx render it unconditionally,
  // it just returns null below while closed), so fetching as soon as it
  // mounts means the list is normally already warm by the time the user
  // actually taps to open it. That matters for the entering animation:
  // SlideInDown captures the sheet's layout position the instant it
  // starts, and if this query were still loading then, it'd measure the
  // short loading-spinner height instead of the full list, finishing the
  // slide-in short — the list then jumps to full height with no
  // animation once data arrives, which reads as "opened halfway."
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['organization-companies'],
    queryFn: getOrganizationCompanies,
  });

  const switchMutation = useMutation({
    mutationFn: (companyId: string) => switchMyCompany(companyId),
    onMutate: (companyId) => setSwitchingId(companyId),
    onSuccess: (updatedStaff) => {
      if (session) signIn(session.token, updatedStaff);
      queryClient.clear();
      onClose();
    },
    onSettled: () => setSwitchingId(null),
  });

  if (!visible) return null;

  const orgLabel = data?.organizationName ? `Everyone in ${data.organizationName}` : currentCompanyName;

  return (
    <View style={StyleSheet.absoluteFill}>
      <AnimatedPressable
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(180)}
        style={[StyleSheet.absoluteFill, styles.scrim]}
        onPress={onClose}
        accessibilityLabel="Close"
      />
      <KeyboardAvoidingView
        pointerEvents="box-none"
        style={styles.avoidingWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View
          entering={SlideInDown.duration(320).easing(Easing.out(Easing.cubic))}
          exiting={SlideOutDown.duration(220).easing(Easing.in(Easing.cubic))}
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconTile}>
                <BuildingIcon />
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>Switch company</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {orgLabel}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <CloseIcon />
            </Pressable>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <ActivityIndicator color={colors.navy} style={styles.loading} />
            ) : isError ? (
              <Text style={styles.errorText}>{error.message}</Text>
            ) : !data || data.companies.length === 0 ? (
              <Text style={styles.emptyText}>No companies yet.</Text>
            ) : (
              data.companies.map((c, i) => (
                <CompanyRow
                  key={c._id}
                  company={c}
                  index={i}
                  pending={switchMutation.isPending && switchingId === c._id}
                  onPress={() => switchMutation.mutate(c._id)}
                />
              ))
            )}
          </ScrollView>
          {switchMutation.isError && <Text style={styles.errorText}>{switchMutation.error.message}</Text>}

          <Pressable
            style={styles.newRow}
            onPress={() => {
              onClose();
              router.push('/new-company');
            }}>
            <View style={styles.newRowIcon}>
              <PlusIcon />
            </View>
            <Text style={styles.newRowText}>New company</Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: 'rgba(18,23,58,0.32)',
  },
  avoidingWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '86%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    flexShrink: 1,
  },
  headerIconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flexShrink: 1,
  },
  headerTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 17,
    color: colors.navyInk,
  },
  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },
  list: {
    marginTop: 14,
    // Keeps the sheet's height roughly stable between its loading and
    // loaded states, so a still-in-flight fetch when the entering
    // animation starts doesn't get visibly stranded short — see the
    // useQuery comment above.
    minHeight: 220,
  },
  loading: {
    marginVertical: 24,
  },
  errorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.danger,
    textAlign: 'center',
    marginVertical: 12,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: 24,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  companyRowActive: {
    backgroundColor: colors.navySoft,
    borderColor: colors.navySoft,
  },
  companyLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  companyLogoText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  companyText: {
    flex: 1,
    minWidth: 0,
  },
  companyName: {
    fontFamily: fonts.headingBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  companySub: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  activeCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.4,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
  },
  newRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newRowText: {
    fontFamily: fonts.headingBold,
    fontSize: 14,
    color: colors.navyInk,
  },
});
