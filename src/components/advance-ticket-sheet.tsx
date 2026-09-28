import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { ACTION_LABEL, STATUS_META, TICKET_STATUS_LABEL } from '@/constants/maintenance';
import { colors, fonts } from '@/design/theme';

import type { MaintenanceTicketDto, TicketStatus } from '@/api/maintenance';

// Mirrors OperationMaintenancePage/StatusChangeConfirmDialog.js — shown
// before a ticket's status actually advances, from either the list row's
// action button or the detail screen's, whichever triggered it.

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
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!visible || !ticket || !nextStatus) return null;

  const meta = STATUS_META[nextStatus];
  const Icon = nextStatus === 'RESOLVED' ? CheckCircleIcon : WrenchIcon;
  const actionLabel = ACTION_LABEL[ticket.status] ?? 'Advance';

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

        <View style={styles.actionsRow}>
          <Pressable style={styles.cancelButton} onPress={onCancel} disabled={submitting}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.confirmButton} onPress={onConfirm} disabled={submitting}>
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
  confirmButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
});
