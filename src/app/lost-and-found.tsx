import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { colors, fonts, radii, shadow } from '@/design/theme';
import {
  LOST_FOUND_CATEGORIES,
  LOST_FOUND_STATUS_META,
  LOST_FOUND_STATUS_ORDER,
  MOCK_LOST_FOUND_ITEMS,
  type LostFoundStatus,
} from '@/mock/lost-and-found';

// -----------------------------------------------------------------------
// New feature, reachable from the More page. Mockups were pasted directly
// in chat (not part of design/design-reference/). The Filter sheet follows
// the same overlay pattern as reservations-list.tsx's two sheets — a scrim
// + bottom sheet local to this screen, not a separate route — except
// Status here is single-select (radio, one checkmark at a time) rather
// than the multi-select chips Reservations uses, matching this mockup's
// own single-checkmark example exactly.
//
// The "FILTERED BY" pill row only reflects the Status filter, same as the
// mockup — Category isn't called out there even though it's also a real,
// working filter. Fresh/default state has no filter applied (the mockup's
// own screenshot already shows "Claimed" pre-applied, which reads as an
// example of *using* the filter, not the screen's true starting state).
// -----------------------------------------------------------------------

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function FilterIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 5h16l-6 8v6l-4-2v-4z" />
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
function WalletIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={7} width={13} height={13} rx={2} transform="rotate(-15 10.5 13.5)" />
      <Circle cx={9} cy={12} r={1} />
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
function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

function formatShort(d: Date) {
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function FilterSheet({
  visible,
  appliedStatus,
  appliedCategory,
  onClose,
  onApply,
}: {
  visible: boolean;
  appliedStatus: LostFoundStatus | null;
  appliedCategory: string;
  onClose: () => void;
  onApply: (status: LostFoundStatus | null, category: string) => void;
}) {
  const [draftStatus, setDraftStatus] = useState(appliedStatus);
  const [draftCategory, setDraftCategory] = useState(appliedCategory);

  if (!visible) return null;

  return (
    <>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close filter" />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Filter items</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <CloseIcon />
          </Pressable>
        </View>

        <Text style={styles.sheetSectionLabel}>STATUS</Text>
        <View style={styles.statusGrid}>
          {LOST_FOUND_STATUS_ORDER.map((status) => {
            const meta = LOST_FOUND_STATUS_META[status];
            const active = draftStatus === status;
            return (
              <Pressable
                key={status}
                style={[styles.statusChip, active && { borderColor: colors.navy, backgroundColor: colors.navySoft }]}
                onPress={() => setDraftStatus(active ? null : status)}>
                <View style={[styles.statusDot, { backgroundColor: meta.dot }]} />
                <Text style={[styles.statusChipLabel, active && { color: colors.navy }]}>{meta.label}</Text>
                {active && <CheckIcon color={colors.navy} />}
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sheetSectionLabel, styles.sheetSectionSpaced]}>CATEGORY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {['All', ...LOST_FOUND_CATEGORIES].map((category) => {
            const active = draftCategory === category;
            return (
              <Pressable
                key={category}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setDraftCategory(category)}>
                <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{category}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          style={styles.clearAll}
          onPress={() => {
            setDraftStatus(null);
            setDraftCategory('All');
          }}>
          <Text style={styles.clearAllText}>Clear all</Text>
        </Pressable>

        <Pressable style={styles.applyButton} onPress={() => onApply(draftStatus, draftCategory)}>
          <Text style={styles.applyButtonText}>Apply filters</Text>
        </Pressable>
      </View>
    </>
  );
}

export default function LostAndFoundScreen() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LostFoundStatus | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_LOST_FOUND_ITEMS.filter((item) => {
      if (q && !item.description.toLowerCase().includes(q) && !item.foundLocation.toLowerCase().includes(q)) {
        return false;
      }
      if (statusFilter && item.status !== statusFilter) return false;
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      return true;
    });
  }, [search, statusFilter, categoryFilter]);

  const unclaimedCount = MOCK_LOST_FOUND_ITEMS.filter((i) => i.status === 'UNCLAIMED').length;
  const activeFilterCount = (statusFilter ? 1 : 0) + (categoryFilter !== 'All' ? 1 : 0);

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <BackIcon />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Lost &amp; Found</Text>
            <Text style={styles.headerSubtitle}>
              {MOCK_LOST_FOUND_ITEMS.length} item{MOCK_LOST_FOUND_ITEMS.length === 1 ? '' : 's'} · {unclaimedCount}{' '}
              unclaimed
            </Text>
          </View>
        </View>
        <Pressable style={styles.filterButton} onPress={() => setFilterOpen(true)}>
          <FilterIcon />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.searchWrapper}>
          <View pointerEvents="none" style={styles.searchIcon}>
            <SearchIcon />
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search item or location"
            placeholderTextColor={colors.textFaint}
            style={styles.searchInput}
          />
        </View>

        {statusFilter && (
          <View style={styles.filteredByRow}>
            <Text style={styles.filteredByLabel}>FILTERED BY</Text>
            <View style={styles.filteredByPill}>
              <Text style={styles.filteredByPillText}>{LOST_FOUND_STATUS_META[statusFilter].label}</Text>
            </View>
          </View>
        )}

        <View style={styles.list}>
          {filtered.map((item) => {
            const meta = LOST_FOUND_STATUS_META[item.status];
            return (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemIcon}>
                  <WalletIcon color={colors.amber} />
                </View>
                <View style={styles.itemText}>
                  <Text style={styles.itemDescription} numberOfLines={1}>
                    {item.description}
                  </Text>
                  <View style={styles.itemMetaRow}>
                    <Text style={styles.itemMeta}>{item.foundLocation}</Text>
                    <View style={styles.itemMetaDot} />
                    <Text style={styles.itemMeta}>{formatShort(item.foundDate)}</Text>
                  </View>
                </View>
                <View style={[styles.itemStatusPill, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.itemStatusText, { color: meta.text }]}>{meta.label.toUpperCase()}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => router.push('/log-found-item')}>
        <PlusIcon />
        <Text style={styles.fabText}>Log item</Text>
      </Pressable>

      <FilterSheet
        visible={filterOpen}
        appliedStatus={statusFilter}
        appliedCategory={categoryFilter}
        onClose={() => setFilterOpen(false)}
        onApply={(status, category) => {
          setStatusFilter(status);
          setCategoryFilter(category);
          setFilterOpen(false);
        }}
      />
    </KeyboardSafeView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
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
  filterButton: {
    width: 38,
    height: 38,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 8.5,
    color: '#FFFFFF',
  },
  body: {
    paddingBottom: 100,
  },
  searchWrapper: {
    marginTop: 16,
    paddingHorizontal: 20,
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 32,
    zIndex: 1,
  },
  searchInput: {
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    backgroundColor: colors.surface,
    paddingLeft: 34,
    paddingRight: 12,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
  },
  filteredByRow: {
    marginTop: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filteredByLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
    color: colors.textFaint,
    letterSpacing: 0.4,
  },
  filteredByPill: {
    backgroundColor: colors.navySoft,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  filteredByPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
    color: colors.navy,
  },
  list: {
    marginTop: 14,
    paddingHorizontal: 20,
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    flex: 1,
    minWidth: 0,
  },
  itemDescription: {
    fontFamily: fonts.headingBold,
    fontSize: 13.5,
    color: colors.navyInk,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  itemMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  itemMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textFaint,
  },
  itemStatusPill: {
    flexShrink: 0,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  itemStatusText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    height: 52,
    paddingHorizontal: 20,
    paddingLeft: 18,
    borderRadius: 26,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.navy,
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  fabText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  scrim: {
    backgroundColor: 'rgba(18,23,58,0.32)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 28,
    shadowColor: '#12173A',
    shadowOpacity: 0.2,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -10 },
    elevation: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 17,
    color: colors.navyInk,
  },
  sheetSectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  sheetSectionSpaced: {
    marginTop: 20,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  statusChip: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1.6,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  statusChipLabel: {
    flexGrow: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.navyInk,
  },
  categoryRow: {
    gap: 8,
    marginTop: 10,
  },
  categoryChip: {
    backgroundColor: colors.bg,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  categoryChipActive: {
    backgroundColor: colors.navyInk,
  },
  categoryChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  clearAll: {
    alignItems: 'center',
    marginTop: 18,
  },
  clearAllText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.coral,
  },
  applyButton: {
    height: 50,
    borderRadius: radii.input,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    ...shadow.button,
  },
  applyButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
