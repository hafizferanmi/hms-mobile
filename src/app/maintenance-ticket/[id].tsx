import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { MaintenanceTicketDto, MaintenanceTicketLogDto, TicketLogType, TicketStatus } from '@/api/maintenance';

import { AdvanceTicketSheet } from '@/components/advance-ticket-sheet';
import { MaintenanceStatusStepper } from '@/components/maintenance-status-stepper';
import {
  ACTION_LABEL,
  LOG_TYPE_META,
  MAINTENANCE_RADIUS,
  MAINT_NEXT_STATUS,
  PRIORITY_META,
  STATUS_META,
  TICKET_CATEGORY_LABEL,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_LABEL,
} from '@/constants/maintenance';
import { colors, fonts } from '@/design/theme';
import { useAdvanceTicketStatus, useTicket, useTicketLogs } from '@/hooks/use-maintenance';

// Mobile port of OperationMaintenancePage/TicketDetailModal.js +
// TicketActivityLog.js — the read-only ticket view (status change +
// activity history); field edits happen on the separate
// maintenance-ticket-form.tsx, reached via the edit icon here. Opened with
// the full ticket already serialized into the `ticket` param (see
// maintenance.tsx's row onPress) since there's no GET-by-id endpoint —
// see useTicket()'s own comment on why this reads from a cache slot
// instead of an initial-data prop directly.

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function EditIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
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

function PlusCircleIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 8v8M8 12h8" />
    </Svg>
  );
}
function HistoryIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 12a9 9 0 1 0 3-6.7" />
      <Path d="M3 4v5h5" />
      <Path d="M12 7v5l4 2" />
    </Svg>
  );
}
function FlagIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 21V4" />
      <Path d="M5 4h13l-3 4 3 4H5" />
    </Svg>
  );
}
function PersonAddIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={8} r={3.5} />
      <Path d="M2 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
      <Path d="M19 8v6M16 11h6" />
    </Svg>
  );
}
function SwapIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 4v13M7 17l-3-3M7 17l3-3" />
      <Path d="M17 20V7M17 7l3 3M17 7l-3 3" />
    </Svg>
  );
}
function PersonIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={8} r={3.5} />
      <Path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </Svg>
  );
}
function PencilIcon({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Svg>
  );
}

const LOG_ICON: Record<TicketLogType, (color: string) => React.ReactNode> = {
  CREATED: (color) => <PlusCircleIcon color={color} />,
  STATUS_CHANGED: (color) => <HistoryIcon color={color} />,
  PRIORITY_CHANGED: (color) => <FlagIcon color={color} />,
  ASSIGNED: (color) => <PersonAddIcon color={color} />,
  REASSIGNED: (color) => <SwapIcon color={color} />,
  UNASSIGNED: (color) => <PersonIcon color={color} />,
  UPDATED: (color) => <PencilIcon color={color} />,
};

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

function formatLogTimestamp(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function LogRow({ log, isLast }: { log: MaintenanceTicketLogDto; isLast: boolean }) {
  const meta = LOG_TYPE_META[log.type];
  return (
    <View style={[styles.logRow, !isLast && styles.logRowSpacing]}>
      {!isLast && <View style={styles.logLine} />}
      <View style={[styles.logIcon, { backgroundColor: meta.soft }]}>{LOG_ICON[log.type](meta.color)}</View>
      <View style={styles.logText}>
        <Text style={styles.logMessage}>{log.message}</Text>
        <Text style={styles.logMeta}>
          {log.performedBy?.name || '—'} · {formatLogTimestamp(log.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export default function MaintenanceTicketDetailScreen() {
  const { id, ticket: ticketParam } = useLocalSearchParams<{ id: string; ticket: string }>();
  const initialTicket = useMemo<MaintenanceTicketDto>(() => JSON.parse(ticketParam), [ticketParam]);
  const { data: ticket } = useTicket(id, initialTicket);
  const { data: logs, isLoading: logsLoading } = useTicketLogs(id);
  const advanceMutation = useAdvanceTicketStatus();

  const [pendingAdvance, setPendingAdvance] = useState<{ ticket: MaintenanceTicketDto; nextStatus: TicketStatus } | null>(null);

  const nextStatus = MAINT_NEXT_STATUS[ticket.status];
  const statusMeta = STATUS_META[ticket.status];
  const priorityMeta = PRIORITY_META[ticket.priority];

  async function handleConfirmAdvance(resolutionNote?: string) {
    if (!pendingAdvance) return;
    await advanceMutation.mutateAsync({ ticketId: pendingAdvance.ticket._id, status: pendingAdvance.nextStatus, resolutionNote });
    setPendingAdvance(null);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackIcon />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {ticket.title}
        </Text>
        <Pressable
          style={styles.editButton}
          onPress={() => router.push({ pathname: '/maintenance-ticket-form', params: { ticket: JSON.stringify(ticket) } })}
          hitSlop={8}>
          <EditIcon />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.metaLine}>
          {TICKET_CATEGORY_LABEL[ticket.category]} · {ticket.roomOrArea}
        </Text>

        <View style={styles.statusBlock}>
          <View>
            <View style={[styles.statusPill, { backgroundColor: statusMeta.soft }]}>
              <Text style={[styles.statusPillText, { color: statusMeta.color }]}>{TICKET_STATUS_LABEL[ticket.status]}</Text>
            </View>
            <MaintenanceStatusStepper status={ticket.status} size="md" />
          </View>
          {nextStatus && (
            <Pressable
              style={styles.advanceButton}
              onPress={() => setPendingAdvance({ ticket, nextStatus })}>
              <Text style={styles.advanceButtonText}>{ACTION_LABEL[ticket.status]}</Text>
              <ArrowRightIcon color={colors.navy} />
            </Pressable>
          )}
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Priority</Text>
            <View style={[styles.priorityPill, { backgroundColor: priorityMeta.soft }]}>
              <Text style={[styles.priorityPillText, { color: priorityMeta.color }]}>{TICKET_PRIORITY_LABEL[ticket.priority]}</Text>
            </View>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Assigned to</Text>
            <View style={styles.assignedRow}>
              <View style={[styles.assigneeAvatar, { backgroundColor: ticket.assignee ? colors.navySoft : colors.slateSoft }]}>
                <Text style={[styles.assigneeAvatarText, { color: ticket.assignee ? colors.navy : colors.textFaint }]}>
                  {getInitials(ticket.assignee)}
                </Text>
              </View>
              <Text style={styles.assigneeName} numberOfLines={1}>
                {ticket.assignee || 'Unassigned'}
              </Text>
            </View>
          </View>
        </View>

        {!!ticket.description && (
          <View style={styles.field}>
            <Text style={styles.infoLabel}>Description</Text>
            <Text style={styles.description}>{ticket.description}</Text>
          </View>
        )}

        {!!ticket.resolutionNote && (
          <View style={styles.field}>
            <Text style={styles.infoLabel}>What was done</Text>
            <Text style={styles.resolutionBox}>{ticket.resolutionNote}</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.infoLabel}>Activity</Text>
          <View style={styles.activityBox}>
            {logsLoading ? (
              <ActivityIndicator color={colors.navy} style={{ marginVertical: 20 }} />
            ) : !logs || logs.length === 0 ? (
              <Text style={styles.emptyLogText}>No activity recorded yet</Text>
            ) : (
              logs.map((log, i) => <LogRow key={log._id} log={log} isLast={i === logs.length - 1} />)
            )}
          </View>
        </View>
      </ScrollView>

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
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.headingExtraBold,
    fontSize: 17,
    color: colors.navyInk,
  },
  editButton: {
    width: 34,
    height: 34,
    borderRadius: MAINTENANCE_RADIUS,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  metaLine: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.textFaint,
    marginBottom: 16,
  },
  statusBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 9,
  },
  statusPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  advanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1.5,
    borderColor: colors.navySoft,
    borderRadius: MAINTENANCE_RADIUS + 3,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  advanceButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.navy,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  infoCell: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 8,
  },
  priorityPill: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  priorityPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  assignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assigneeAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  assigneeAvatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  assigneeName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13.5,
    color: colors.text,
    flexShrink: 1,
  },
  field: {
    marginBottom: 22,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.textMuted,
  },
  resolutionBox: {
    backgroundColor: colors.successSoft,
    borderRadius: 12,
    padding: 14,
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.text,
  },
  activityBox: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 16,
  },
  emptyLogText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.textFaint,
    textAlign: 'center',
    paddingVertical: 12,
  },
  logRow: {
    flexDirection: 'row',
    gap: 12,
    position: 'relative',
  },
  logRowSpacing: {
    paddingBottom: 18,
  },
  logLine: {
    position: 'absolute',
    left: 13,
    top: 28,
    bottom: -18,
    width: 1.4,
    backgroundColor: colors.border,
  },
  logIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logText: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1,
  },
  logMessage: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.text,
  },
  logMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 2,
  },
});
