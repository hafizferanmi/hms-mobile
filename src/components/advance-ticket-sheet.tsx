import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { ACTION_LABEL, STATUS_META, TICKET_STATUS_LABEL } from '@/constants/maintenance';
import { colors, fonts } from '@/design/theme';

import type { MaintenanceTicketDto, TicketStatus } from '@/api/maintenance';

// Mirrors OperationMaintenancePage/StatusChangeConfirmDialog.js — shown
// before a ticket's status actually advances, from either the list row's
// action button or the detail screen's, whichever triggered it. Resolving
// specifically now also asks what was done (MaintenanceTicket's
// `resolutionNote` field, kept on the ticket and in its activity log) —
// required there, same as web, since businesslogic/maintenanceTicket.js
// only ever saves it on the request that actually moves a ticket to
// RESOLVED.
const NOTE_MAX_LENGTH = 1000;

function WrenchIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14.7 6.3a4 4 0 0 0-5.6 5.6L3 18l3 3 6.1-6.1a4 4 0 0 0 5.6-5.6l-2.8 2.8-2-2z" />
    </Svg>
  );
}
function CheckCircleIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={3} width={18} height={18} rx={9} />
      <Path d="m8 12 3 3 5-6" />
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

export function AdvanceTicketSheet({
  visible,
  ticket,
  nextStatus,
  submitting,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  ticket: MaintenanceTicketDto | null;
  nextStatus: TicketStatus | null;
  submitting: boolean;
  onConfirm: (resolutionNote?: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState('');

  // Re-seeds the note field each time this opens for a (possibly
  // different) ticket — adjusted during render rather than in a
  // useEffect, same pattern used for the filter sheet in maintenance.tsx.
  const currentTicketId = ticket?._id ?? null;
  const [prevTicketId, setPrevTicketId] = useState(currentTicketId);
  if (currentTicketId !== prevTicketId) {
    setPrevTicketId(currentTicketId);
    setNote('');
  }

  if (!visible || !ticket || !nextStatus) return null;

  const meta = STATUS_META[nextStatus];
  const Icon = nextStatus === 'RESOLVED' ? CheckCircleIcon : WrenchIcon;
  const actionLabel = ACTION_LABEL[ticket.status] ?? 'Advance';
  const isResolving = nextStatus === 'RESOLVED';
  const canConfirm = !submitting && (!isResolving || note.trim().length > 0);

  return (
    <>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onCancel} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.headRow}>
          <View style={{ width: 32 }} />
          <View style={[styles.iconCircle, { backgroundColor: meta.soft }]}>
            <Icon color={meta.color} />
          </View>
          <Pressable onPress={onCancel} hitSlop={8}>
            <CloseIcon />
          </Pressable>
        </View>

        <Text style={styles.title}>{actionLabel}?</Text>
        <Text style={styles.message}>
          This moves <Text style={styles.ticketTitle}>&ldquo;{ticket.title}&rdquo;</Text> to{' '}
          <Text style={{ color: meta.color, fontFamily: fonts.bodyBold }}>{TICKET_STATUS_LABEL[nextStatus]}</Text>.
        </Text>

        {isResolving && (
          <View style={styles.noteField}>
            <Text style={styles.noteLabel}>What was done?</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              maxLength={NOTE_MAX_LENGTH}
              placeholder="e.g. Replaced the faulty AC capacitor and tested cooling"
              placeholderTextColor={colors.textFaint}
              multiline
              autoFocus
              style={styles.noteInput}
            />
          </View>
        )}

        <View style={styles.actionsRow}>
          <Pressable style={styles.cancelButton} onPress={onCancel} disabled={submitting}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
            onPress={() => onConfirm(isResolving ? note.trim() : undefined)}
            disabled={!canConfirm}>
            {submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.confirmButtonText}>{actionLabel}</Text>}
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: 'rgba(18,23,58,0.32)',
  },
  sheet: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: '32%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 17,
    color: colors.navyInk,
    marginTop: 10,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  ticketTitle: {
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
  noteField: {
    width: '100%',
    marginBottom: 20,
  },
  noteLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    color: colors.textMuted,
    marginBottom: 7,
    textAlign: 'left',
  },
  noteInput: {
    width: '100%',
    minHeight: 88,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.text,
    textAlignVertical: 'top',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.text,
  },
  confirmButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
});
