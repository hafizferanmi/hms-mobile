import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CHECKIN_TYPE_TO_STATUS, type CheckInType } from '@/api/reservations';
import { addGuestTag, type GuestTagCategory, type GuestTagDto } from '@/api/guest-tags';
import { updateGuestProfileTags, type GuestStayDto } from '@/api/guests';
import { GUEST_TAG_CATEGORY_META, GUEST_TAG_CATEGORY_ORDER } from '@/constants/guest-tags';
import { RESERVATION_STATUS_META } from '@/constants/reservation';
import { colors, fonts, radii } from '@/design/theme';
import { useGuestProfileDetail } from '@/hooks/use-guest-profiles';
import { useGuestTags } from '@/hooks/use-guest-tags';

// -----------------------------------------------------------------------
// GuestDetail.html + AddTagSheet.html + NewTagSheet.html, per FLOW.md:
// tapping a tag's "x" or an existing tag in the Add Tag sheet both just
// PUT the guest's full tag id list (PUT /guest-profiles/:id — there's no
// separate attach/detach endpoint); creating a new tag chains POST
// /guest-tags then that same PUT, so it both exists company-wide and is
// immediately applied to this guest, matching "new tag added, back to
// GuestDetail.html" in FLOW.md.
//
// The header's kebab ("more") button has no documented destination in
// FLOW.md, so it stays inert. The message icon does — "opens native
// messaging (no new screen)" — wired to the device's SMS composer.
// -----------------------------------------------------------------------

const STAY_STATUS_LABEL: Record<CheckInType, string> = {
  RESERVED: 'Upcoming',
  CHECKEDIN: 'In House',
  CHECKEDOUT: 'Completed',
  CANCELED: 'Canceled',
};

function formatNaira(amount: number) {
  return `NGN ${Math.round(amount).toLocaleString('en-US')}`;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatStayRange(arrival: string, departure?: string) {
  const from = new Date(arrival);
  const fromLabel = from.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  if (!departure) return `${fromLabel} ${from.getFullYear()}`;
  const to = new Date(departure);
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  const toLabel = to.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  return sameMonth ? `${from.getDate()}–${toLabel}` : `${fromLabel} – ${toLabel}`;
}

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function MessageIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}
function MoreIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={1.8}>
      <Path d="M5 12h.01M12 12h.01M19 12h.01" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
    </Svg>
  );
}
function CloseIcon({ size = 18, color = colors.textMuted }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function PlusIcon({ size = 10, color = colors.navy }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function SearchIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m21 21-4.3-4.3M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0z" />
    </Svg>
  );
}
function ArrowBackIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function TagSheet({
  visible,
  onClose,
  appliedTags,
  allTags,
  onAddExisting,
  onCreated,
  pending,
  errorMessage,
}: {
  visible: boolean;
  onClose: () => void;
  appliedTags: GuestTagDto[];
  allTags: GuestTagDto[];
  onAddExisting: (tag: GuestTagDto) => void;
  onCreated: (tag: GuestTagDto) => void;
  pending: boolean;
  errorMessage?: string;
}) {
  const [view, setView] = useState<'pick' | 'create'>('pick');
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<GuestTagCategory>('STATUS');

  const createMutation = useMutation({
    mutationFn: () => addGuestTag({ name: name.trim(), category, color: GUEST_TAG_CATEGORY_META[category].color }),
    onSuccess: (tag) => {
      onCreated(tag);
      setName('');
      setCategory('STATUS');
      setView('pick');
    },
  });

  function resetAndClose() {
    setView('pick');
    setQuery('');
    setName('');
    setCategory('STATUS');
    onClose();
  }

  if (!visible) return null;

  const appliedIds = new Set(appliedTags.map((t) => t._id));
  const q = query.trim().toLowerCase();
  const pickable = allTags.filter((t) => !appliedIds.has(t._id) && (!q || t.name.toLowerCase().includes(q)));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={resetAndClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView
        pointerEvents="box-none"
        style={styles.avoidingWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {view === 'pick' ? (
            <>
              <View style={styles.pickSearchRow}>
                <View style={styles.pickSearchIcon}>
                  <SearchIcon />
                </View>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search tags..."
                  placeholderTextColor={colors.textFaint}
                  style={styles.pickSearchInput}
                />
              </View>

              <ScrollView style={styles.pickList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {allTags.length === 0 ? (
                  <Text style={styles.emptyText}>No tags yet — create the first one below.</Text>
                ) : (
                  GUEST_TAG_CATEGORY_ORDER.map((cat) => {
                    const tagsInCategory = pickable.filter((t) => t.category === cat);
                    if (tagsInCategory.length === 0) return null;
                    return (
                      <View key={cat} style={styles.categoryGroup}>
                        <Text style={styles.sectionLabel}>{GUEST_TAG_CATEGORY_META[cat].label.toUpperCase()}</Text>
                        {tagsInCategory.map((tag) => (
                          <Pressable
                            key={tag._id}
                            style={styles.pickRow}
                            disabled={pending}
                            onPress={() => onAddExisting(tag)}>
                            <View style={[styles.pickDot, { backgroundColor: GUEST_TAG_CATEGORY_META[cat].color }]} />
                            <Text style={styles.pickRowText}>{tag.name}</Text>
                          </Pressable>
                        ))}
                      </View>
                    );
                  })
                )}
                {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

                <Pressable style={styles.createRow} onPress={() => setView('create')}>
                  <PlusIcon size={14} />
                  <Text style={styles.createRowText}>Create a new tag</Text>
                </Pressable>
              </ScrollView>
            </>
          ) : (
            <>
              <View style={styles.createHeaderRow}>
                <Pressable onPress={() => setView('pick')} hitSlop={8}>
                  <ArrowBackIcon />
                </Pressable>
                <Text style={styles.createHeaderTitle}>New tag</Text>
              </View>

              <ScrollView style={styles.pickList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>NAME</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Anniversary"
                  placeholderTextColor={colors.textFaint}
                  style={styles.nameInput}
                  autoFocus
                />

                <Text style={[styles.fieldLabel, styles.categoryLabel]}>CATEGORY</Text>
                <View style={styles.categoryGrid}>
                  {GUEST_TAG_CATEGORY_ORDER.map((cat) => {
                    const meta = GUEST_TAG_CATEGORY_META[cat];
                    const active = category === cat;
                    return (
                      <Pressable
                        key={cat}
                        style={[styles.categoryOption, active && { borderColor: meta.color, backgroundColor: meta.soft }]}
                        onPress={() => setCategory(cat)}>
                        <View style={[styles.pickDot, { backgroundColor: meta.color }]} />
                        <Text style={styles.categoryOptionText}>{meta.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.fieldLabel, styles.categoryLabel]}>PREVIEW</Text>
                <View
                  style={[
                    styles.previewPill,
                    { backgroundColor: GUEST_TAG_CATEGORY_META[category].soft },
                  ]}>
                  <Text style={[styles.previewPillText, { color: GUEST_TAG_CATEGORY_META[category].color }]}>
                    {name.trim() || 'Tag preview'}
                  </Text>
                </View>

                {createMutation.isError && <Text style={styles.errorText}>{createMutation.error.message}</Text>}
              </ScrollView>

              <View style={styles.createFooter}>
                <Pressable style={styles.cancelButton} onPress={() => setView('pick')} disabled={createMutation.isPending}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.submitButton, (!name.trim() || createMutation.isPending) && styles.submitButtonDisabled]}
                  disabled={!name.trim() || createMutation.isPending}
                  onPress={() => createMutation.mutate()}>
                  {createMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Create tag</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function GuestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: profile, isLoading, isError, error, refetch: refetchProfile } = useGuestProfileDetail(id);
  const { data: allTags, refetch: refetchTags } = useGuestTags();
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const [tagsError, setTagsError] = useState<string | undefined>();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchTags()]);
    setRefreshing(false);
  }

  const updateTagsMutation = useMutation({
    mutationFn: (tagIds: string[]) => updateGuestProfileTags(id, tagIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-profile', id] });
      queryClient.invalidateQueries({ queryKey: ['guest-profiles'] });
      setTagsError(undefined);
    },
    onError: (err: Error) => setTagsError(err.message),
  });

  if (isLoading) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }
  if (isError || !profile) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>{error?.message ?? 'Guest not found.'}</Text>
      </View>
    );
  }

  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Unnamed guest';
  const status = profile.latestStatus ? CHECKIN_TYPE_TO_STATUS[profile.latestStatus] : null;
  const statusMeta = status ? RESERVATION_STATUS_META[status] : null;
  const sinceYear = profile.stays.length
    ? Math.min(...profile.stays.map((s) => new Date(s.dateOfArrival).getFullYear()))
    : null;

  function removeTag(tagId: string) {
    updateTagsMutation.mutate((profile!.tags.filter((t) => t._id !== tagId)).map((t) => t._id));
  }
  function addExistingTag(tag: GuestTagDto) {
    updateTagsMutation.mutate([...profile!.tags.map((t) => t._id), tag._id]);
    setTagSheetOpen(false);
  }
  function onTagCreated(tag: GuestTagDto) {
    queryClient.invalidateQueries({ queryKey: ['guest-tags'] });
    updateTagsMutation.mutate([...profile!.tags.map((t) => t._id), tag._id]);
    setTagSheetOpen(false);
  }

  function messageGuest() {
    if (!profile!.phone) {
      Alert.alert('No phone number', 'This guest has no phone number on file.');
      return;
    }
    Linking.openURL(`sms:${profile!.phone}`).catch(() =>
      Alert.alert('Could not open messaging', 'Your device may not support this action.'),
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackIcon />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton} onPress={messageGuest} accessibilityLabel="Message guest">
            <MessageIcon />
          </Pressable>
          {/* TODO(nav): no documented destination for this button yet. */}
          <Pressable style={styles.iconButton} accessibilityLabel="More options">
            <MoreIcon />
          </Pressable>
        </View>
      </View>

      <View style={styles.profileRow}>
        <View style={[styles.avatar, status === 'IN_HOUSE' && styles.avatarRinged]}>
          <Text style={styles.avatarText}>{getInitials(name)}</Text>
        </View>
        <View style={styles.profileText}>
          <View style={styles.profileNameLine}>
            <Text style={styles.profileName}>{name}</Text>
            {statusMeta && (
              <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
                <Text style={[styles.statusBadgeText, { color: statusMeta.text }]}>{statusMeta.label.toUpperCase()}</Text>
              </View>
            )}
          </View>
          <Text style={styles.profileContact} numberOfLines={1}>
            {[profile.email, profile.phone].filter(Boolean).join(' · ') || 'No contact info'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} colors={[colors.navy]} />
        }>
        <Text style={styles.sectionLabel}>TAGS</Text>
        <View style={styles.tagWrap}>
          {profile.tags.map((tag) => {
            const meta = GUEST_TAG_CATEGORY_META[tag.category];
            return (
              <View key={tag._id} style={[styles.tagPill, { backgroundColor: meta.soft }]}>
                <Text style={[styles.tagPillText, { color: meta.color }]}>{tag.name}</Text>
                <Pressable onPress={() => removeTag(tag._id)} disabled={updateTagsMutation.isPending} hitSlop={6}>
                  <CloseIcon size={10} color={meta.color} />
                </Pressable>
              </View>
            );
          })}
          <Pressable style={styles.addTagPill} onPress={() => setTagSheetOpen(true)}>
            <PlusIcon />
            <Text style={styles.addTagPillText}>Add tag</Text>
          </Pressable>
        </View>
        {!!tagsError && <Text style={styles.errorText}>{tagsError}</Text>}

        <View style={styles.statsRow}>
          <View style={[styles.statCell, styles.statCellWide, styles.statCellDivider]}>
            <Text style={styles.statLabel}>TOTAL SPEND</Text>
            <Text style={styles.statValue}>{formatNaira(profile.totalSpend)}</Text>
          </View>
          <View style={[styles.statCell, styles.statCellDivider]}>
            <Text style={styles.statLabel}>STAYS</Text>
            <Text style={styles.statValue}>{profile.stayCount}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>SINCE</Text>
            <Text style={styles.statValue}>{sinceYear ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>RESERVATION HISTORY</Text>
          {profile.stays.length === 0 ? (
            <Text style={styles.emptyText}>No reservations yet.</Text>
          ) : (
            <View style={styles.timeline}>
              <View style={styles.timelineLine} />
              {profile.stays.map((stay: GuestStayDto) => (
                <View key={stay._id} style={styles.timelineRow}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <View>
                      <Text style={styles.timelineDate}>{formatStayRange(stay.dateOfArrival, stay.dateOfDeparture)}</Text>
                      <Text style={styles.timelineRoom}>
                        {stay.room ? [stay.room.number, stay.room.roomTypeId?.name].filter(Boolean).join(' · ') : '—'}
                      </Text>
                    </View>
                    <View style={styles.timelineRight}>
                      <Text style={styles.timelineAmount}>{formatNaira(stay.rate?.amount ?? 0)}</Text>
                      <Text style={styles.timelineStatus}>{STAY_STATUS_LABEL[stay.type]}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NOTES &amp; STORY</Text>
          <View style={styles.notesCard}>
            <Text style={styles.notesText}>{profile.note || 'No notes yet.'}</Text>
          </View>
        </View>
      </ScrollView>

      <TagSheet
        visible={tagSheetOpen}
        onClose={() => setTagSheetOpen(false)}
        appliedTags={profile.tags}
        allTags={allTags ?? []}
        onAddExisting={addExistingTag}
        onCreated={onTagCreated}
        pending={updateTagsMutation.isPending}
        errorMessage={tagsError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
  },
  notFoundText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 2.4,
    borderColor: 'transparent',
  },
  avatarRinged: {
    borderColor: colors.success,
  },
  avatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.navy,
  },
  profileText: {
    flexShrink: 1,
    minWidth: 0,
  },
  profileNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  profileName: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 18,
    color: colors.navyInk,
  },
  statusBadge: {
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  statusBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9.5,
  },
  profileContact: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textFaint,
    letterSpacing: 0.6,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  tagPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
  },
  addTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1.4,
    borderStyle: 'dashed',
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  addTagPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    color: colors.navy,
  },
  errorText: {
    marginTop: 10,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.danger,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
  },
  statCell: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statCellWide: {
    flex: 1.3,
  },
  statCellDivider: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  statLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  statValue: {
    marginTop: 5,
    fontFamily: fonts.headingExtraBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  section: {
    marginTop: 24,
  },
  emptyText: {
    marginTop: 10,
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: 'center',
  },
  timeline: {
    marginTop: 12,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 5,
    top: 6,
    bottom: 6,
    width: 1.4,
    backgroundColor: colors.border,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 14,
    paddingBottom: 18,
  },
  timelineDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  timelineDate: {
    fontFamily: fonts.headingBold,
    fontSize: 13,
    color: colors.navyInk,
  },
  timelineRoom: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  timelineRight: {
    alignItems: 'flex-end',
  },
  timelineAmount: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 13,
    color: colors.navyInk,
  },
  timelineStatus: {
    fontFamily: fonts.body,
    fontSize: 10.5,
    color: colors.textFaint,
    marginTop: 2,
  },
  notesCard: {
    marginTop: 10,
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: 14,
  },
  notesText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
    lineHeight: 19,
  },
  // Tag sheet
  scrim: {
    backgroundColor: 'rgba(18,23,58,0.32)',
  },
  avoidingWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '82%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 28,
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
  pickSearchRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  pickSearchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  pickSearchInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    paddingLeft: 34,
    paddingRight: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  pickList: {
    marginTop: 16,
  },
  categoryGroup: {
    marginBottom: 8,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 4,
  },
  pickDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pickRowText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  createRowText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.navy,
  },
  createHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  createHeaderTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 17,
    color: colors.navyInk,
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  categoryLabel: {
    marginTop: 20,
  },
  nameInput: {
    marginTop: 8,
    height: 46,
    borderWidth: 1.6,
    borderColor: colors.navy,
    borderRadius: 11,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  categoryOption: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  categoryOptionText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.navyInk,
  },
  previewPill: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  previewPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
  },
  createFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  submitButton: {
    flex: 1.4,
    height: 48,
    borderRadius: radii.input,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
