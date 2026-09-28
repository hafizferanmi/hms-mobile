import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import type { MaintenanceTicketDto, TicketCategory, TicketPriority, TicketStatus } from '@/api/maintenance';

import { AdvanceTicketSheet } from '@/components/advance-ticket-sheet';
import { MaintenanceStatusStepper } from '@/components/maintenance-status-stepper';
import {
  ACTION_LABEL,
  DEFAULT_STATUS_FILTERS,
  MAINTENANCE_RADIUS,
  MAINT_NEXT_STATUS,
  PRIORITY_DISPLAY_ORDER,
  PRIORITY_META,
  STATUS_META,
  TICKET_CATEGORY_LABEL,
  TICKET_CATEGORY_ORDER,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_ORDER,
} from '@/constants/maintenance';
import { colors, fonts } from '@/design/theme';
import { useAdvanceTicketStatus, useTickets } from '@/hooks/use-maintenance';

// Mobile port of hms-frontend-react's OperationMaintenancePage — see
// OperationMaintenancePage.js/-Container.js there for the reference this
// was built against. Two deliberate adaptations for a phone-width screen:
//   - Desktop's 4 separate filter dropdowns (Priority/Status/Category/
//     Sort) collapse into one "Filters" sheet (checklist sections, same
//     as reservations-list.tsx's own FilterStatusSheet) plus a small
//     Newest/Oldest toggle — same filter dimensions, less chrome.
//   - The ticket row's 5-column grid becomes a stacked card: icon+title+
//     status pill, then assignee+stepper, then the action button — same
//     information, just vertical instead of horizontal.
// Per explicit design direction: this page's cards/pills use a tighter
// 6px radius (MAINTENANCE_RADIUS) matching desktop's own choice for this
// page specifically, and status is conveyed only via the pill/stepper —
// no colored left-edge accent on the row itself.

const SEARCH_DEBOUNCE_MS = 350;

function SearchIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35" />
    </Svg>
  );
}
function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function PlusIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function ArrowRightIcon({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}
function CheckCircleIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 11.1V12a9 9 0 1 1-5.3-8.2" />
      <Path d="m9 11 3 3 8-8" />
    </Svg>
  );
}
function WrenchIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14.7 6.3a4 4 0 0 0-5.6 5.6L3 18l3 3 6.1-6.1a4 4 0 0 0 5.6-5.6l-2.8 2.8-2-2z" />
    </Svg>
  );
}
function FilterIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 5h16l-6 8v6l-4-2v-4z" />
    </Svg>
  );
}
function SortIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 7h11M3 12h7M3 17h4M17 4v16M17 4l4 4M17 4l-4 4" />
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
function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

function getInitials(name?: string) {
  if (!name) return '—';
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

const SORT_LABEL: Record<'date_desc' | 'date_asc', string> = {
  date_desc: 'Newest first',
  date_asc: 'Oldest first',
};

function FilterSheet({
  visible,
  priority,
  status,
  category,
  onClose,
  onApply,
}: {
  visible: boolean;
  priority: Set<TicketPriority>;
  status: Set<TicketStatus>;
  category: Set<TicketCategory>;
  onClose: () => void;
  onApply: (next: { priority: Set<TicketPriority>; status: Set<TicketStatus>; category: Set<TicketCategory> }) => void;
}) {
  const [draftPriority, setDraftPriority] = useState(priority);
  const [draftStatus, setDraftStatus] = useState(status);
  const [draftCategory, setDraftCategory] = useState(category);

  // Re-seeds the draft from whatever's currently applied each time the
  // sheet opens (this component stays mounted the whole time, only
  // toggling `visible`, so its draft state would otherwise carry over
  // stale edits from the last time it was open) — adjusted during render
  // rather than in a useEffect to avoid the extra cascading-render pass.
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setDraftPriority(priority);
      setDraftStatus(status);
      setDraftCategory(category);
    }
  }

  if (!visible) return null;

  function toggle<T>(set: Set<T>, setSet: (next: Set<T>) => void, value: T) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSet(next);
  }

  const totalSelected = draftPriority.size + draftStatus.size + draftCategory.size;

  return (
    <>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close filters" />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Filter tickets</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <CloseIcon />
          </Pressable>
        </View>

        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetSectionLabel}>Priority</Text>
          <View style={styles.chipGrid}>
            {PRIORITY_DISPLAY_ORDER.map((p) => {
              const meta = PRIORITY_META[p];
              const active = draftPriority.has(p);
              return (
                <Pressable
                  key={p}
                  style={[styles.chip, { backgroundColor: active ? meta.soft : colors.surface, borderColor: active ? meta.color : colors.border }]}
                  onPress={() => toggle(draftPriority, setDraftPriority, p)}>
                  <Text style={[styles.chipLabel, { color: active ? meta.color : colors.textMuted }]}>{TICKET_PRIORITY_LABEL[p]}</Text>
                  {active && <CheckIcon color={meta.color} />}
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sheetSectionLabel}>Status</Text>
          <View style={styles.chipGrid}>
            {TICKET_STATUS_ORDER.map((s) => {
              const meta = STATUS_META[s];
              const active = draftStatus.has(s);
              return (
                <Pressable
                  key={s}
                  style={[styles.chip, { backgroundColor: active ? meta.soft : colors.surface, borderColor: active ? meta.color : colors.border }]}
                  onPress={() => toggle(draftStatus, setDraftStatus, s)}>
                  <Text style={[styles.chipLabel, { color: active ? meta.color : colors.textMuted }]}>{TICKET_STATUS_LABEL[s]}</Text>
                  {active && <CheckIcon color={meta.color} />}
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sheetSectionLabel}>Category</Text>
          <View style={styles.chipGrid}>
            {TICKET_CATEGORY_ORDER.map((c) => {
              const active = draftCategory.has(c);
              return (
                <Pressable
                  key={c}
                  style={[styles.chip, { backgroundColor: active ? colors.navySoft : colors.surface, borderColor: active ? colors.navy : colors.border }]}
                  onPress={() => toggle(draftCategory, setDraftCategory, c)}>
                  <Text style={[styles.chipLabel, { color: active ? colors.navy : colors.textMuted }]}>{TICKET_CATEGORY_LABEL[c]}</Text>
                  {active && <CheckIcon color={colors.navy} />}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <Pressable
          style={styles.clearAll}
          onPress={() => {
            setDraftPriority(new Set());
            setDraftStatus(new Set());
            setDraftCategory(new Set());
          }}>
          <Text style={styles.clearAllText}>Clear all</Text>
        </Pressable>

        <Pressable
          style={styles.applyButton}
          onPress={() => onApply({ priority: draftPriority, status: draftStatus, category: draftCategory })}>
          <Text style={styles.applyButtonText}>Apply filters ({totalSelected})</Text>
        </Pressable>
      </View>
    </>
  );
}

function TicketRow({
  ticket,
  onPress,
  onAdvance,
}: {
  ticket: MaintenanceTicketDto;
  onPress: () => void;
  onAdvance: () => void;
}) {
  const priorityMeta = PRIORITY_META[ticket.priority];
  const statusMeta = STATUS_META[ticket.status];
  const next = MAINT_NEXT_STATUS[ticket.status];

  return (
    <Pressable style={styles.ticketRow} onPress={onPress}>
      <View style={styles.ticketTopRow}>
        <View style={[styles.catIcon, { backgroundColor: priorityMeta.soft }]}>
          <WrenchIcon color={priorityMeta.color} />
        </View>
        <View style={styles.ticketTitleCol}>
          <Text style={styles.ticketTitle} numberOfLines={1}>
            {ticket.title}
          </Text>
          <Text style={styles.ticketMeta} numberOfLines={1}>
            {TICKET_CATEGORY_LABEL[ticket.category]} · {ticket.roomOrArea}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusMeta.soft }]}>
          <Text style={[styles.statusPillText, { color: statusMeta.color }]}>{TICKET_STATUS_LABEL[ticket.status]}</Text>
        </View>
      </View>

      <View style={styles.ticketMidRow}>
        <View style={styles.assigneeRow}>
          <View style={[styles.assigneeAvatar, { backgroundColor: ticket.assignee ? colors.navySoft : colors.slateSoft }]}>
            <Text style={[styles.assigneeAvatarText, { color: ticket.assignee ? colors.navy : colors.textFaint }]}>
              {getInitials(ticket.assignee)}
            </Text>
          </View>
          <Text style={styles.assigneeName} numberOfLines={1}>
            {ticket.assignee || 'Unassigned'}
          </Text>
        </View>
        <MaintenanceStatusStepper status={ticket.status} size="sm" />
      </View>

      {next ? (
        <Pressable style={styles.actionButton} onPress={onAdvance}>
          <Text style={styles.actionButtonText}>{ACTION_LABEL[ticket.status]}</Text>
          <ArrowRightIcon color={colors.navy} />
        </Pressable>
      ) : (
        <View style={styles.resolvedLabel}>
          <CheckCircleIcon color={colors.textFaint} />
          <Text style={styles.resolvedLabelText}>Resolved</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function MaintenanceScreen() {
  const insets = useSafeAreaInsets();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const [priorityFilters, setPriorityFilters] = useState<Set<TicketPriority>>(new Set());
  const [statusFilters, setStatusFilters] = useState<Set<TicketStatus>>(new Set(DEFAULT_STATUS_FILTERS));
  const [categoryFilters, setCategoryFilters] = useState<Set<TicketCategory>>(new Set());
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc'>('date_desc');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingAdvance, setPendingAdvance] = useState<{ ticket: MaintenanceTicketDto; nextStatus: TicketStatus } | null>(null);

  const { data, isLoading, refetch } = useTickets({
    search: search || undefined,
    priority: priorityFilters.size ? Array.from(priorityFilters) : undefined,
    status: statusFilters.size ? Array.from(statusFilters) : undefined,
    category: categoryFilters.size ? Array.from(categoryFilters) : undefined,
    sort: sortBy,
  });
  const advanceMutation = useAdvanceTicketStatus();

  const ticketGroups = useMemo(() => {
    const tickets = data?.tickets ?? [];
    return PRIORITY_DISPLAY_ORDER.map((priority) => ({
      priority,
      tickets: tickets.filter((t) => t.priority === priority),
    })).filter((g) => g.tickets.length > 0);
  }, [data]);

  const activeFilterCount = priorityFilters.size + statusFilters.size + categoryFilters.size;

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function handleAdvance(ticket: MaintenanceTicketDto) {
    const next = MAINT_NEXT_STATUS[ticket.status];
    if (next) setPendingAdvance({ ticket, nextStatus: next });
  }

  async function handleConfirmAdvance() {
    if (!pendingAdvance) return;
    await advanceMutation.mutateAsync({ ticketId: pendingAdvance.ticket._id, status: pendingAdvance.nextStatus });
    setPendingAdvance(null);
  }

  function handleClearFilters() {
    setSearchInput('');
    setPriorityFilters(new Set());
    setStatusFilters(new Set(DEFAULT_STATUS_FILTERS));
    setCategoryFilters(new Set());
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <BackIcon />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Maintenance</Text>
            <Text style={styles.headerSubtitle}>
              {data?.total ?? 0} tickets · {data?.urgentOpenCount ?? 0} urgent
            </Text>
          </View>
        </View>
        <Pressable style={styles.newButton} onPress={() => router.push('/maintenance-ticket-form')}>
          <PlusIcon />
          <Text style={styles.newButtonText}>New ticket</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrapper}>
        <View pointerEvents="none" style={styles.searchIcon}>
          <SearchIcon />
        </View>
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search issue or room"
          placeholderTextColor={colors.textFaint}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.toolbarRow}>
        <Pressable style={styles.toolbarButton} onPress={() => setFilterSheetOpen(true)}>
          <FilterIcon />
          <Text style={styles.toolbarButtonText}>Filters</Text>
          {activeFilterCount > 0 && (
            <View style={styles.toolbarBadge}>
              <Text style={styles.toolbarBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable
          style={styles.toolbarButton}
          onPress={() => setSortBy((s) => (s === 'date_desc' ? 'date_asc' : 'date_desc'))}>
          <SortIcon />
          <Text style={styles.toolbarButtonText}>{SORT_LABEL[sortBy]}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.navy} colors={[colors.navy]} />}>
        {isLoading ? (
          <ActivityIndicator color={colors.navy} style={{ marginTop: 40 }} />
        ) : ticketGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No tickets match your filters</Text>
            <Pressable style={styles.clearFiltersInline} onPress={handleClearFilters}>
              <Text style={styles.clearFiltersInlineText}>Clear filters</Text>
            </Pressable>
          </View>
        ) : (
          ticketGroups.map((group) => {
            const meta = PRIORITY_META[group.priority];
            return (
              <View key={group.priority} style={styles.priorityGroup}>
                <View style={styles.priorityHead}>
                  <View style={[styles.priorityDot, { backgroundColor: meta.color }]} />
                  <Text style={styles.priorityTitle}>{TICKET_PRIORITY_LABEL[group.priority]} priority</Text>
                  <Text style={styles.priorityCount}>{group.tickets.length}</Text>
                </View>
                {group.tickets.map((ticket) => (
                  <TicketRow
                    key={ticket._id}
                    ticket={ticket}
                    onPress={() =>
                      router.push({ pathname: '/maintenance-ticket/[id]', params: { id: ticket._id, ticket: JSON.stringify(ticket) } })
                    }
                    onAdvance={() => handleAdvance(ticket)}
                  />
                ))}
              </View>
            );
          })
        )}
        {ticketGroups.length > 0 && <Text style={styles.footerCount}>Total {data?.total ?? 0} tickets</Text>}
      </ScrollView>

      <FilterSheet
        visible={filterSheetOpen}
        priority={priorityFilters}
        status={statusFilters}
        category={categoryFilters}
        onClose={() => setFilterSheetOpen(false)}
        onApply={(next) => {
          setPriorityFilters(next.priority);
          setStatusFilters(next.status);
          setCategoryFilters(next.category);
          setFilterSheetOpen(false);
        }}
      />

      <AdvanceTicketSheet
        visible={!!pendingAdvance}
        ticket={pendingAdvance?.ticket ?? null}
        nextStatus={pendingAdvance?.nextStatus ?? null}
        submitting={advanceMutation.isPending}
        onConfirm={handleConfirmAdvance}
        onCancel={() => setPendingAdvance(null)}
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 19,
    color: colors.navyInk,
  },
  headerSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.navy,
    borderRadius: MAINTENANCE_RADIUS,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  newButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  searchWrapper: {
    marginHorizontal: 20,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: MAINTENANCE_RADIUS,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIcon: {
    marginTop: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.text,
  },
  toolbarRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: MAINTENANCE_RADIUS,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  toolbarButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
    color: colors.text,
  },
  toolbarBadge: {
    backgroundColor: colors.navy,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  toolbarBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  priorityGroup: {
    marginBottom: 18,
  },
  priorityHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 9,
    paddingHorizontal: 2,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 13.5,
    color: colors.text,
  },
  priorityCount: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11.5,
    color: colors.textFaint,
  },
  ticketRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: MAINTENANCE_RADIUS,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: colors.navyInk,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  catIcon: {
    width: 32,
    height: 32,
    borderRadius: MAINTENANCE_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ticketTitleCol: {
    flex: 1,
    minWidth: 0,
  },
  ticketTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.text,
  },
  ticketMeta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.textFaint,
    marginTop: 2,
  },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    flexShrink: 0,
  },
  statusPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  ticketMidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  assigneeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  assigneeAvatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9.5,
  },
  assigneeName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.textMuted,
    flexShrink: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.navySoft,
    borderRadius: MAINTENANCE_RADIUS + 3,
    paddingVertical: 10,
  },
  actionButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.navy,
  },
  resolvedLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resolvedLabelText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textFaint,
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: MAINTENANCE_RADIUS,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 14,
  },
  emptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.text,
  },
  clearFiltersInline: {
    borderWidth: 1.5,
    borderColor: colors.navySoft,
    borderRadius: MAINTENANCE_RADIUS + 3,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  clearFiltersInlineText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.navy,
  },
  footerCount: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: 4,
  },
  scrim: {
    backgroundColor: 'rgba(18,23,58,0.32)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 16,
    color: colors.navyInk,
  },
  sheetScroll: {
    maxHeight: 360,
  },
  sheetSectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 8,
    marginTop: 14,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
  },
  clearAll: {
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  clearAllText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  applyButton: {
    backgroundColor: colors.navy,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
