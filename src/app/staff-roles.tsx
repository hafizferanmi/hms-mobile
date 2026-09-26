import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { deleteRole, type RoleDto } from '@/api/roles';
import { deleteStaff, humanizeStaffRole, setStaffDisabled, type StaffDto } from '@/api/staff';
import { colors, fonts, radii, shadow } from '@/design/theme';
import { useRoles } from '@/hooks/use-roles';
import { useStaff } from '@/hooks/use-staff';

// -----------------------------------------------------------------------
// StaffList.html + RolesList.html — the same screen, a segmented control
// switches between tabs (see FLOW.md). RoleActionsMenu.html/a matching
// StaffActionsMenu are built as in-screen overlays here (scrim + bottom
// sheet), not separate routes — same pattern as reservation/[id].tsx's
// MoreMenuOverlay, which never became its own route either.
//
// "Edit role"/"Duplicate role"/"Add role" have no designed screen
// (FLOW.md says so explicitly) — left as a placeholder alert rather than
// inventing a permissions-picker UI. "Edit staff" reuses add-staff.tsx's
// form in edit mode (same fields, real PUT /staffs/:id endpoint), same
// reuse decision as room-type/[id].tsx's "Edit room type".
// -----------------------------------------------------------------------

type Tab = 'staff' | 'roles';

const AVATAR_COLORS = [
  { bg: colors.navy, soft: colors.navySoft },
  { bg: colors.coral, soft: colors.coralSoft },
  { bg: colors.amber, soft: colors.amberSoft },
  { bg: colors.purple, soft: colors.purpleSoft },
];

function avatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function SearchIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={11} cy={11} r={7} />
      <Path d="m21 21-4.3-4.3" />
    </Svg>
  );
}
function PlusIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function MoreIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={1.8}>
      <Circle cx={5} cy={12} r={1.6} fill={colors.text} stroke="none" />
      <Circle cx={12} cy={12} r={1.6} fill={colors.text} stroke="none" />
      <Circle cx={19} cy={12} r={1.6} fill={colors.text} stroke="none" />
    </Svg>
  );
}
function RoleIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 16.9 5.9 20.2l1.5-6.7L2.3 8.9l6.8-.7z" />
    </Svg>
  );
}

function StaffRow({ staff, index, onPress }: { staff: StaffDto; index: number; onPress: () => void }) {
  const avatar = avatarColor(index);
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
        <Text style={styles.avatarText}>{getInitials(staff.name)}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {staff.name}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {staff.email}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: avatar.soft }]}>
        <Text style={[styles.badgeText, { color: avatar.bg }]}>{humanizeStaffRole(staff.role)}</Text>
      </View>
    </Pressable>
  );
}

function RoleRow({ role, index, onMorePress }: { role: RoleDto; index: number; onMorePress: () => void }) {
  const avatar = avatarColor(index);
  return (
    <View style={[styles.row, styles.roleRow]}>
      <View style={[styles.roleIconTile, { backgroundColor: avatar.soft }]}>
        <RoleIcon color={avatar.bg} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{role.name}</Text>
        {!!role.description && (
          <Text style={styles.roleDescription} numberOfLines={1}>
            {role.description}
          </Text>
        )}
        <Text style={styles.roleMeta}>
          {role.staffCount} staff · {role.permissions.length} permissions
        </Text>
      </View>
      <Pressable onPress={onMorePress} hitSlop={8} style={styles.moreButton}>
        <MoreIcon />
      </Pressable>
    </View>
  );
}

function StaffActionsMenu({
  staff,
  pending,
  errorMessage,
  onClose,
  onEdit,
  onToggleDisabled,
  onDelete,
}: {
  staff: StaffDto;
  pending: boolean;
  errorMessage?: string;
  onClose: () => void;
  onEdit: () => void;
  onToggleDisabled: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close menu" />
      <View style={styles.sheetWrapper}>
        <View style={styles.sheetGroup}>
          <View style={[styles.sheetItem, styles.sheetItemDivider]}>
            <Text style={styles.sheetKicker}>{staff.name.toUpperCase()}</Text>
          </View>
          <Pressable style={[styles.sheetItem, styles.sheetItemDivider]} onPress={onEdit}>
            <Text style={styles.sheetItemText}>Edit staff</Text>
          </Pressable>
          <Pressable style={styles.sheetItem} onPress={onToggleDisabled} disabled={pending}>
            <Text style={styles.sheetItemText}>{staff.disabled ? 'Activate staff' : 'Deactivate staff'}</Text>
          </Pressable>
        </View>
        {!!errorMessage && (
          <View style={styles.sheetGroup}>
            <View style={styles.sheetItem}>
              <Text style={styles.sheetErrorText}>{errorMessage}</Text>
            </View>
          </View>
        )}
        <View style={styles.sheetGroup}>
          <Pressable style={styles.sheetItem} onPress={onDelete} disabled={pending}>
            {pending ? <ActivityIndicator color={colors.danger} /> : <Text style={styles.sheetDestructiveText}>Delete staff</Text>}
          </Pressable>
        </View>
        <View style={styles.sheetGroup}>
          <Pressable style={styles.sheetItem} onPress={onClose}>
            <Text style={styles.sheetCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

function RoleActionsMenu({
  role,
  pending,
  errorMessage,
  onClose,
  onDelete,
}: {
  role: RoleDto;
  pending: boolean;
  errorMessage?: string;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close menu" />
      <View style={styles.sheetWrapper}>
        <View style={styles.sheetGroup}>
          <View style={[styles.sheetItem, styles.sheetItemDivider]}>
            <Text style={styles.sheetKicker}>{role.name.toUpperCase()}</Text>
          </View>
          <Pressable
            style={[styles.sheetItem, styles.sheetItemDivider]}
            onPress={() => Alert.alert('Edit role', 'A full permissions editor for existing roles isn’t built yet.')}>
            <Text style={styles.sheetItemText}>Edit role</Text>
          </Pressable>
          <Pressable
            style={styles.sheetItem}
            onPress={() => Alert.alert('Duplicate role', 'Duplicating a role isn’t built yet.')}>
            <Text style={styles.sheetItemText}>Duplicate role</Text>
          </Pressable>
        </View>
        {!!errorMessage && (
          <View style={styles.sheetGroup}>
            <View style={styles.sheetItem}>
              <Text style={styles.sheetErrorText}>{errorMessage}</Text>
            </View>
          </View>
        )}
        <View style={styles.sheetGroup}>
          <Pressable style={styles.sheetItem} onPress={onDelete} disabled={pending}>
            {pending ? <ActivityIndicator color={colors.danger} /> : <Text style={styles.sheetDestructiveText}>Delete role</Text>}
          </Pressable>
        </View>
        <View style={styles.sheetGroup}>
          <Pressable style={styles.sheetItem} onPress={onClose}>
            <Text style={styles.sheetCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

export default function StaffRolesScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('staff');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVATED' | 'DEACTIVATED'>('ACTIVATED');
  const [activeStaffMenu, setActiveStaffMenu] = useState<StaffDto | null>(null);
  const [activeRoleMenu, setActiveRoleMenu] = useState<RoleDto | null>(null);
  const [menuError, setMenuError] = useState<string | undefined>();

  const queryClient = useQueryClient();
  const {
    data: staff,
    isLoading: staffLoading,
    isError: staffError,
    error: staffErrorObj,
    refetch: refetchStaff,
  } = useStaff();
  const {
    data: roles,
    isLoading: rolesLoading,
    isError: rolesError,
    error: rolesErrorObj,
    refetch: refetchRoles,
  } = useRoles();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchStaff(), refetchRoles()]);
    setRefreshing(false);
  }

  const toggleDisabledMutation = useMutation({
    mutationFn: (s: StaffDto) => setStaffDisabled(s._id, !s.disabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setActiveStaffMenu(null);
      setMenuError(undefined);
    },
    onError: (err: Error) => setMenuError(err.message),
  });
  const deleteStaffMutation = useMutation({
    mutationFn: (s: StaffDto) => deleteStaff(s._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setActiveStaffMenu(null);
      setMenuError(undefined);
    },
    onError: (err: Error) => setMenuError(err.message),
  });
  const deleteRoleMutation = useMutation({
    mutationFn: (r: RoleDto) => deleteRole(r._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setActiveRoleMenu(null);
      setMenuError(undefined);
    },
    onError: (err: Error) => setMenuError(err.message),
  });

  const filteredStaff = useMemo(() => {
    const wantDisabled = statusFilter === 'DEACTIVATED';
    const q = search.trim().toLowerCase();
    return (staff ?? [])
      // GET /staffs builds its response via Staff.aggregate() (see
      // businesslogic/staff.js#getAllStaffs), which returns raw documents
      // straight from Mongo rather than going through Mongoose's document
      // layer — so `disabled` comes back `undefined` (not `false`) for any
      // staff record saved before this field was consistently set,
      // instead of falling back to the schema's `default: false`. A
      // strict `s.disabled === wantDisabled` check then excludes those
      // staff from BOTH the Activated and Deactivated tabs, since
      // `undefined` matches neither `false` nor `true` — Boolean(...)
      // coerces it to `false` first, matching hms-frontend-react's own
      // `!s.disabled` / `Boolean(s.disabled)` filter (StaffsPage.js).
      .filter((s) => Boolean(s.disabled) === wantDisabled)
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
  }, [staff, statusFilter, search]);

  // Counts for the Activated/Deactivated pills themselves — same search
  // match as filteredStaff above, but independent of which status is
  // currently selected, so both numbers stay visible at once.
  const statusCounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matchesSearch = (s: StaffDto) => !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    const list = (staff ?? []).filter(matchesSearch);
    return {
      activated: list.filter((s) => !Boolean(s.disabled)).length,
      deactivated: list.filter((s) => Boolean(s.disabled)).length,
    };
  }, [staff, search]);

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (roles ?? []).filter((r) => !q || r.name.toLowerCase().includes(q));
  }, [roles, search]);

  function openStaffMenu(s: StaffDto) {
    setMenuError(undefined);
    setActiveStaffMenu(s);
  }
  function openRoleMenu(r: RoleDto) {
    setMenuError(undefined);
    setActiveRoleMenu(r);
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <BackIcon />
          </Pressable>
          <Text style={styles.headerTitle}>Staff &amp; Roles</Text>
        </View>
        <View style={styles.segmented}>
          <Pressable
            style={[styles.segment, tab === 'staff' && styles.segmentActive]}
            onPress={() => {
              setTab('staff');
              setSearch('');
            }}>
            <Text style={[styles.segmentText, tab === 'staff' && styles.segmentTextActive]}>Staff</Text>
          </Pressable>
          <Pressable
            style={[styles.segment, tab === 'roles' && styles.segmentActive]}
            onPress={() => {
              setTab('roles');
              setSearch('');
            }}>
            <Text style={[styles.segmentText, tab === 'roles' && styles.segmentTextActive]}>Roles</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} colors={[colors.navy]} />
        }>
        <View style={styles.searchWrap}>
          <View style={styles.searchIconWrap}>
            <SearchIcon />
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={tab === 'staff' ? 'Search staff' : 'Search roles'}
            placeholderTextColor={colors.textFaint}
            style={styles.searchInput}
          />
        </View>

        {tab === 'staff' && (
          <View style={styles.filterRow}>
            <Pressable
              style={[styles.filterPill, statusFilter === 'ACTIVATED' && styles.filterPillActive]}
              onPress={() => setStatusFilter('ACTIVATED')}>
              <Text style={[styles.filterPillText, statusFilter === 'ACTIVATED' && styles.filterPillTextActive]}>
                Activated ({statusCounts.activated})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterPill, statusFilter === 'DEACTIVATED' && styles.filterPillActive]}
              onPress={() => setStatusFilter('DEACTIVATED')}>
              <Text style={[styles.filterPillText, statusFilter === 'DEACTIVATED' && styles.filterPillTextActive]}>
                Deactivated ({statusCounts.deactivated})
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.list}>
          {tab === 'staff' ? (
            staffLoading ? (
              <ActivityIndicator color={colors.navy} style={styles.loading} />
            ) : staffError ? (
              <Text style={styles.errorText}>{staffErrorObj.message}</Text>
            ) : filteredStaff.length === 0 ? (
              <Text style={styles.emptyText}>No staff found.</Text>
            ) : (
              filteredStaff.map((s, i) => <StaffRow key={s._id} staff={s} index={i} onPress={() => openStaffMenu(s)} />)
            )
          ) : rolesLoading ? (
            <ActivityIndicator color={colors.navy} style={styles.loading} />
          ) : rolesError ? (
            <Text style={styles.errorText}>{rolesErrorObj.message}</Text>
          ) : filteredRoles.length === 0 ? (
            <Text style={styles.emptyText}>No roles found.</Text>
          ) : (
            filteredRoles.map((r, i) => <RoleRow key={r._id} role={r} index={i} onMorePress={() => openRoleMenu(r)} />)
          )}
        </View>
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => {
          if (tab === 'staff') {
            router.push('/add-staff');
          } else {
            Alert.alert('Add role', 'A full permissions editor for new roles isn’t built yet.');
          }
        }}>
        <PlusIcon />
        <Text style={styles.fabText}>{tab === 'staff' ? 'Add staff' : 'Add role'}</Text>
      </Pressable>

      {activeStaffMenu && (
        <StaffActionsMenu
          staff={activeStaffMenu}
          pending={toggleDisabledMutation.isPending || deleteStaffMutation.isPending}
          errorMessage={menuError}
          onClose={() => setActiveStaffMenu(null)}
          onEdit={() => {
            const id = activeStaffMenu._id;
            setActiveStaffMenu(null);
            router.push(`/add-staff?id=${id}`);
          }}
          onToggleDisabled={() => toggleDisabledMutation.mutate(activeStaffMenu)}
          onDelete={() => deleteStaffMutation.mutate(activeStaffMenu)}
        />
      )}

      {activeRoleMenu && (
        <RoleActionsMenu
          role={activeRoleMenu}
          pending={deleteRoleMutation.isPending}
          errorMessage={menuError}
          onClose={() => setActiveRoleMenu(null)}
          onDelete={() => deleteRoleMutation.mutate(activeRoleMenu)}
        />
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
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: colors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 18,
    color: colors.navyInk,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: 11,
    padding: 4,
    marginTop: 16,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  },
  segmentActive: {
    backgroundColor: colors.navy,
  },
  segmentText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  body: {
    paddingBottom: 120,
  },
  searchWrap: {
    marginTop: 16,
    marginHorizontal: 20,
    position: 'relative',
    justifyContent: 'center',
  },
  searchIconWrap: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  searchInput: {
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.surface,
    paddingLeft: 34,
    paddingRight: 12,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginHorizontal: 20,
  },
  filterPill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  filterPillActive: {
    backgroundColor: colors.navyInk,
    borderColor: colors.navyInk,
  },
  filterPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  list: {
    marginTop: 14,
    marginHorizontal: 20,
    gap: 10,
  },
  loading: {
    marginTop: 24,
  },
  errorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 24,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
  },
  roleRow: {
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  roleIconTile: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 13.5,
    color: colors.navyInk,
  },
  rowSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  roleDescription: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 2,
  },
  roleMeta: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 4,
  },
  badge: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  moreButton: {
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: 18,
    height: 52,
    paddingLeft: 18,
    paddingRight: 20,
    borderRadius: 26,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...shadow.button,
  },
  fabText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  scrim: {
    backgroundColor: 'rgba(18,23,58,0.32)',
  },
  sheetWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    gap: 8,
  },
  sheetGroup: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  sheetItem: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  sheetItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetKicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textFaint,
  },
  sheetItemText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.navyInk,
  },
  sheetErrorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.danger,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  sheetDestructiveText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.coral,
  },
  sheetCloseText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.navyInk,
  },
});
