import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts } from '@/design/theme';

// -----------------------------------------------------------------------
// "Edit Role — Split View" mockup: category tabs (Accommodation/
// Reservation/Guests/Analytics/Settings/Sensitive) across the top, a
// group sidebar per category on the left, and that group's individual
// permission toggles on the right, with a tri-state "Select All" row for
// the group and a "Select All in {category}" button for the whole tab.
//
// UI only, per explicit instruction — there's no backend model for this
// yet (hms-backend-node's real Role model is a flat per-module view/
// create/edit/delete grid, see src/api/roles.ts's RolePermission; this
// screen's much richer category > group > permission tree doesn't exist
// there). PERMISSION_CATEGORIES below and every toggle are local UI state
// only: "Save" just closes the screen, nothing is persisted anywhere.
// staff-roles.tsx's "Edit role" action opens this with ?roleId&roleName
// (previously an inert "not built yet" alert).
// -----------------------------------------------------------------------

type Permission = { id: string; label: string; defaultOn: boolean };
type PermissionGroup = { id: string; label: string; permissions: Permission[] };
type PermissionCategory = { id: string; label: string; groups: PermissionGroup[] };

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'accommodation',
    label: 'Accommodation',
    groups: [
      {
        id: 'calendar',
        label: 'Calendar',
        permissions: [
          { id: 'view-calendar', label: 'View Calendar', defaultOn: true },
          { id: 'modify-room-status', label: 'Modify Room Status', defaultOn: true },
          { id: 'view-room-status-history', label: 'View Room Status History', defaultOn: true },
          { id: 'room-availability-summary', label: 'Room Availability Summary', defaultOn: true },
          { id: 'share-calendar', label: 'Share Calendar', defaultOn: false },
        ],
      },
      {
        id: 'rooms',
        label: 'Rooms',
        permissions: [
          { id: 'view-rooms', label: 'View Rooms', defaultOn: true },
          { id: 'add-edit-room', label: 'Add / Edit Room', defaultOn: true },
          { id: 'delete-room', label: 'Delete Room', defaultOn: false },
          { id: 'manage-room-types', label: 'Manage Room Types', defaultOn: false },
          { id: 'view-room-pricing', label: 'View Room Pricing', defaultOn: true },
        ],
      },
      {
        id: 'housekeeping',
        label: 'Housekeeping',
        permissions: [
          { id: 'view-housekeeping-board', label: 'View Housekeeping Board', defaultOn: true },
          { id: 'update-clean-status', label: 'Update Clean Status', defaultOn: true },
          { id: 'assign-housekeeping-staff', label: 'Assign Housekeeping Staff', defaultOn: false },
          { id: 'view-turnover-alerts', label: 'View Turnover Alerts', defaultOn: true },
        ],
      },
      {
        id: 'rate-availability',
        label: 'Adjust Rate & Availability',
        permissions: [
          { id: 'view-rates', label: 'View Rates', defaultOn: true },
          { id: 'edit-room-rates', label: 'Edit Room Rates', defaultOn: false },
          { id: 'block-unblock-dates', label: 'Block / Unblock Dates', defaultOn: false },
          { id: 'bulk-rate-updates', label: 'Bulk Rate Updates', defaultOn: false },
        ],
      },
    ],
  },
  {
    id: 'reservation',
    label: 'Reservation',
    groups: [
      {
        id: 'bookings',
        label: 'Bookings',
        permissions: [
          { id: 'view-reservations', label: 'View Reservations', defaultOn: true },
          { id: 'create-reservation', label: 'Create Reservation', defaultOn: true },
          { id: 'edit-reservation', label: 'Edit Reservation', defaultOn: true },
          { id: 'cancel-reservation', label: 'Cancel Reservation', defaultOn: false },
        ],
      },
      {
        id: 'check-in-out',
        label: 'Check-in / Checkout',
        permissions: [
          { id: 'check-guest-in', label: 'Check Guest In', defaultOn: true },
          { id: 'check-guest-out', label: 'Check Guest Out', defaultOn: true },
          { id: 'revert-checkout', label: 'Revert Checkout', defaultOn: false },
          { id: 'extend-stay', label: 'Extend Stay', defaultOn: true },
        ],
      },
      {
        id: 'availability',
        label: 'Availability',
        permissions: [
          { id: 'check-room-availability', label: 'Check Room Availability', defaultOn: true },
          { id: 'waitlist-management', label: 'Waitlist Management', defaultOn: false },
        ],
      },
    ],
  },
  {
    id: 'guests',
    label: 'Guests',
    groups: [
      {
        id: 'guest-profiles',
        label: 'Guest Profiles',
        permissions: [
          { id: 'view-guest-profiles', label: 'View Guest Profiles', defaultOn: true },
          { id: 'edit-guest-details', label: 'Edit Guest Details', defaultOn: true },
          { id: 'merge-duplicate-profiles', label: 'Merge Duplicate Profiles', defaultOn: false },
          { id: 'view-stay-history', label: 'View Stay History', defaultOn: true },
        ],
      },
      {
        id: 'communication',
        label: 'Communication',
        permissions: [
          { id: 'send-guest-messages', label: 'Send Guest Messages', defaultOn: true },
          { id: 'view-guest-reviews', label: 'View Guest Reviews', defaultOn: true },
          { id: 'respond-to-reviews', label: 'Respond to Reviews', defaultOn: false },
        ],
      },
      {
        id: 'lost-and-found',
        label: 'Lost & Found',
        permissions: [
          { id: 'view-lost-and-found', label: 'View Lost & Found Log', defaultOn: true },
          { id: 'log-found-item', label: 'Log Found Item', defaultOn: true },
          { id: 'mark-item-returned', label: 'Mark Item Returned', defaultOn: false },
        ],
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    groups: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        permissions: [
          { id: 'view-dashboard-stats', label: 'View Dashboard Stats', defaultOn: true },
          { id: 'view-occupancy-trends', label: 'View Occupancy Trends', defaultOn: true },
        ],
      },
      {
        id: 'reports',
        label: 'Reports',
        permissions: [
          { id: 'view-revenue-reports', label: 'View Revenue Reports', defaultOn: false },
          { id: 'view-channel-reports', label: 'View Channel Reports', defaultOn: false },
          { id: 'export-reports', label: 'Export Reports', defaultOn: false },
        ],
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    groups: [
      {
        id: 'company',
        label: 'Company',
        permissions: [
          { id: 'view-company-settings', label: 'View Company Settings', defaultOn: true },
          { id: 'edit-company-info', label: 'Edit Company Info', defaultOn: false },
          { id: 'manage-policies', label: 'Manage Policies', defaultOn: false },
        ],
      },
      {
        id: 'staff',
        label: 'Staff',
        permissions: [
          { id: 'view-staff-list', label: 'View Staff List', defaultOn: true },
          { id: 'add-edit-staff', label: 'Add / Edit Staff', defaultOn: false },
          { id: 'manage-roles-permissions', label: 'Manage Roles & Permissions', defaultOn: false },
        ],
      },
      {
        id: 'customization',
        label: 'Customization',
        permissions: [
          { id: 'manage-custom-fields', label: 'Manage Custom Fields', defaultOn: false },
          { id: 'manage-templates', label: 'Manage Email / SMS Templates', defaultOn: false },
        ],
      },
    ],
  },
  {
    id: 'sensitive',
    label: 'Sensitive',
    groups: [
      {
        id: 'financial',
        label: 'Financial',
        permissions: [
          { id: 'view-revenue-figures', label: 'View Revenue Figures', defaultOn: false },
          { id: 'void-charges', label: 'Void Charges', defaultOn: false },
          { id: 'issue-refunds', label: 'Issue Refunds', defaultOn: false },
          { id: 'access-financial-exports', label: 'Access Financial Exports', defaultOn: false },
        ],
      },
      {
        id: 'system',
        label: 'System',
        permissions: [
          { id: 'manage-integrations', label: 'Manage Integrations', defaultOn: false },
          { id: 'view-audit-log', label: 'View Audit Log', defaultOn: false },
          { id: 'switch-company', label: 'Switch Company / Property', defaultOn: false },
        ],
      },
    ],
  },
];

function permissionKey(categoryId: string, groupId: string, permId: string) {
  return `${categoryId}.${groupId}.${permId}`;
}

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function CheckIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

// The mockup's tri-state "Select All" control: an empty ring when nothing
// in the group is on, a checkmark when everything is, and a plain dash
// (matching the mockup's own literal markup) when it's a mix of the two.
function SelectAllRadio({ state }: { state: 'all' | 'some' | 'none' }) {
  if (state === 'none') return <View style={styles.radio} />;
  return (
    <View style={[styles.radio, styles.radioOn]}>
      {state === 'all' ? <CheckIcon /> : <View style={styles.dash} />}
    </View>
  );
}

function Radio({ on }: { on: boolean }) {
  return <View style={[styles.radio, on && styles.radioOn]}>{on && <CheckIcon />}</View>;
}

export default function RolePermissionsScreen() {
  const insets = useSafeAreaInsets();
  const { roleName } = useLocalSearchParams<{ roleId?: string; roleName?: string }>();
  const displayName = roleName || 'Role';

  const [activeCategoryId, setActiveCategoryId] = useState(PERMISSION_CATEGORIES[0].id);
  const [activeGroupId, setActiveGroupId] = useState(PERMISSION_CATEGORIES[0].groups[0].id);

  const [state, setState] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const category of PERMISSION_CATEGORIES) {
      for (const group of category.groups) {
        for (const perm of group.permissions) {
          initial[permissionKey(category.id, group.id, perm.id)] = perm.defaultOn;
        }
      }
    }
    return initial;
  });

  const activeCategory = PERMISSION_CATEGORIES.find((c) => c.id === activeCategoryId)!;
  const activeGroup = activeCategory.groups.find((g) => g.id === activeGroupId) ?? activeCategory.groups[0];

  function selectCategory(categoryId: string) {
    setActiveCategoryId(categoryId);
    const category = PERMISSION_CATEGORIES.find((c) => c.id === categoryId)!;
    setActiveGroupId(category.groups[0].id);
  }

  // Swiping the body left/right moves to the next/previous category tab —
  // the same destination as tapping a tab directly, just the more
  // discoverable/intuitive gesture on a phone. `swipeDirection` only picks
  // which way the entering animation below slides in from; it doesn't
  // affect which category gets selected.
  const [swipeDirection, setSwipeDirection] = useState<'next' | 'prev'>('next');

  function goToAdjacentCategory(direction: 'next' | 'prev') {
    const currentIndex = PERMISSION_CATEGORIES.findIndex((c) => c.id === activeCategoryId);
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= PERMISSION_CATEGORIES.length) return;
    setSwipeDirection(direction);
    selectCategory(PERMISSION_CATEGORIES[nextIndex].id);
  }

  // activeOffsetX/failOffsetY make this only activate for a clearly
  // horizontal drag — a mostly-vertical one fails out of this gesture
  // immediately and falls through to the group sidebar's/permission
  // list's own vertical ScrollViews instead, so this doesn't fight them
  // for the touch. onEnd (not onUpdate) so a swipe commits once, at
  // release, the same as a tab tap — not a live drag-to-reveal.
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-12, 12])
    .onEnd((e) => {
      if (e.translationX < -40 && e.velocityX < -200) runOnJS(goToAdjacentCategory)('next');
      else if (e.translationX > 40 && e.velocityX > 200) runOnJS(goToAdjacentCategory)('prev');
    });

  // Keeps the active category tab centered in the tabs row as it changes
  // (from a swipe or a direct tap) — clamped at both ends, so a tab near
  // the start/end just scrolls as far as it can and sits fully visible at
  // the edge instead of the row trying (and failing) to center it, which
  // would otherwise either stall short or reveal blank space past the
  // last tab.
  const tabsScrollRef = useRef<ScrollView>(null);
  const tabLayoutsRef = useRef<Record<string, { x: number; width: number }>>({});
  const tabsViewportWidthRef = useRef(0);
  const tabsContentWidthRef = useRef(0);

  useEffect(() => {
    const tab = tabLayoutsRef.current[activeCategoryId];
    const viewportWidth = tabsViewportWidthRef.current;
    if (!tab || !viewportWidth) return;
    const centeredOffset = tab.x + tab.width / 2 - viewportWidth / 2;
    const maxOffset = Math.max(0, tabsContentWidthRef.current - viewportWidth);
    const clampedOffset = Math.min(Math.max(centeredOffset, 0), maxOffset);
    tabsScrollRef.current?.scrollTo({ x: clampedOffset, animated: true });
  }, [activeCategoryId]);

  function togglePermission(groupId: string, permId: string) {
    const key = permissionKey(activeCategoryId, groupId, permId);
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function setGroupPermissions(group: PermissionGroup, value: boolean) {
    setState((prev) => {
      const next = { ...prev };
      for (const perm of group.permissions) {
        next[permissionKey(activeCategoryId, group.id, perm.id)] = value;
      }
      return next;
    });
  }

  function groupState(group: PermissionGroup): 'all' | 'some' | 'none' {
    const values = group.permissions.map((p) => state[permissionKey(activeCategoryId, group.id, p.id)]);
    if (values.every(Boolean)) return 'all';
    if (values.some(Boolean)) return 'some';
    return 'none';
  }

  const categoryAllOn = useMemo(() => {
    const category = PERMISSION_CATEGORIES.find((c) => c.id === activeCategoryId)!;
    return category.groups.every((g) => g.permissions.every((p) => state[permissionKey(activeCategoryId, g.id, p.id)]));
  }, [activeCategoryId, state]);

  function toggleCategorySelectAll() {
    const nextValue = !categoryAllOn;
    setState((prev) => {
      const next = { ...prev };
      for (const group of activeCategory.groups) {
        for (const perm of group.permissions) {
          next[permissionKey(activeCategoryId, group.id, perm.id)] = nextValue;
        }
      }
      return next;
    });
  }

  const activeGroupState = groupState(activeGroup);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackIcon />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {displayName} — Permissions
        </Text>
        {/* No backend model for this yet (see the file-level comment) —
            Save just closes the screen; nothing is persisted. */}
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          Permissions here apply to everyone with the {displayName} role. Toggle each one on or off, then save.
        </Text>
      </View>

      <ScrollView
        ref={tabsScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsRow}
        contentContainerStyle={styles.tabsRowContent}
        onLayout={(e) => {
          tabsViewportWidthRef.current = e.nativeEvent.layout.width;
        }}
        onContentSizeChange={(width) => {
          tabsContentWidthRef.current = width;
        }}>
        {PERMISSION_CATEGORIES.map((category) => {
          const active = category.id === activeCategoryId;
          return (
            <Pressable
              key={category.id}
              style={styles.tab}
              onPress={() => selectCategory(category.id)}
              onLayout={(e) => {
                tabLayoutsRef.current[category.id] = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width };
              }}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{category.label}</Text>
              {active && <View style={styles.tabIndicator} />}
            </Pressable>
          );
        })}
      </ScrollView>

      <GestureDetector gesture={swipeGesture}>
        <View style={styles.splitBody}>
          <Animated.View
            key={activeCategoryId}
            entering={(swipeDirection === 'next' ? SlideInRight : SlideInLeft).duration(220)}
            style={styles.splitBodyInner}>
            <ScrollView style={styles.groupSidebar} showsVerticalScrollIndicator={false}>
              {activeCategory.groups.map((group) => {
                const active = group.id === activeGroupId;
                return (
                  <Pressable
                    key={group.id}
                    style={[styles.groupItem, active && styles.groupItemActive]}
                    onPress={() => setActiveGroupId(group.id)}>
                    <Text style={[styles.groupItemText, active && styles.groupItemTextActive]}>{group.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <ScrollView style={styles.permList} showsVerticalScrollIndicator={false}>
              <Pressable
                style={styles.selectAllRow}
                onPress={() => setGroupPermissions(activeGroup, activeGroupState !== 'all')}>
                <Text style={styles.selectAllText}>Select All — {activeGroup.label}</Text>
                <SelectAllRadio state={activeGroupState} />
              </Pressable>

              {activeGroup.permissions.map((perm) => {
                const key = permissionKey(activeCategoryId, activeGroup.id, perm.id);
                const on = !!state[key];
                return (
                  <Pressable key={perm.id} style={styles.permRow} onPress={() => togglePermission(activeGroup.id, perm.id)}>
                    <Text style={[styles.permLabel, !on && styles.permLabelOff]}>{perm.label}</Text>
                    <Radio on={on} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={styles.footer}>
        <Pressable style={styles.footerButton} onPress={toggleCategorySelectAll}>
          <Text style={styles.footerButtonText}>
            {categoryAllOn ? 'Deselect All in' : 'Select All in'} {activeCategory.label}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const RADIO_BORDER = '#C7CBE2';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.headingBold,
    fontSize: 15,
    color: colors.navyInk,
  },
  saveText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.navy,
  },
  banner: {
    backgroundColor: colors.navySoft,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  bannerText: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.navy,
  },
  tabsRow: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsRowContent: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  tab: {
    paddingBottom: 10,
  },
  tabText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.navyInk,
  },
  tabIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 2.5,
    backgroundColor: colors.navy,
  },
  splitBody: {
    flex: 1,
    // overflow: 'hidden' clips the SlideInLeft/SlideInRight entering
    // animation below to this area — without it, the incoming content
    // would briefly render outside the screen's bounds while sliding in.
    overflow: 'hidden',
  },
  splitBodyInner: {
    flex: 1,
    flexDirection: 'row',
  },
  groupSidebar: {
    width: 118,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: colors.bg,
  },
  groupItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  groupItemActive: {
    backgroundColor: colors.navySoft,
    borderLeftColor: colors.navy,
  },
  groupItemText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  groupItemTextActive: {
    fontFamily: fonts.bodyBold,
    color: colors.navy,
  },
  permList: {
    flex: 1,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectAllText: {
    fontFamily: fonts.headingBold,
    fontSize: 13.5,
    color: colors.navyInk,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  permLabel: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
  },
  permLabelOff: {
    color: colors.textMuted,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.8,
    borderColor: RADIO_BORDER,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioOn: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  dash: {
    width: 9,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 26,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.navyInk,
  },
});
