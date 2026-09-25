import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { formatCustomFieldValue, pairCustomFieldValues } from '@/api/custom-fields';
import {
  cancelReservation,
  checkInReservation,
  checkOutReservation,
  revertCheckoutReservation,
} from '@/api/reservations';
import type { ActivityEntry, FolioEntry } from '@/api/reservation-activity';
import { RESERVATION_STATUS_META, type ReservationStatus } from '@/constants/reservation';
import { colors, fonts, radii } from '@/design/theme';
import { useCustomFields } from '@/hooks/use-custom-fields';
import {
  useInvalidateReservationActivity,
  useReservationActivity,
  useReservationFolio,
} from '@/hooks/use-reservation-activity';
import { useReservations } from '@/hooks/use-reservations';
import { getStayMetaText } from '@/utils/reservation-stay';

// -----------------------------------------------------------------------
// The Reservation Detail hub from design/design-reference/reservations.md:
// ReservationDetail.html (status RESERVED) and ReservationDetailInHouse
// .html (status IN HOUSE) are the same screen, not two routes — they're
// pixel-identical apart from the status pill, the footer button/icon/
// color, and "Add" vs. "Add visitor" copy, all of which are driven by
// `reservation.status` here.
//
// Every tab talks to the real API now: Guest Info from useReservations(),
// Charges from useReservationFolio() (GET /check-ins/:id/charges,
// /payments), Others/Activity from useReservationActivity() (GET
// /check-ins/:id/logs) — see src/hooks/use-reservation-activity.ts.
//
// Which top-bar/footer/more-menu options show up is driven by
// `status`, matching hms-frontend-react's CheckInDesc.js exactly:
//   - Footer button: Check In only while RESERVED, Check Out only once
//     IN_HOUSE — neither shows for CHECKED_OUT/CANCELED (both real,
//     wired mutations — see checkInMutation/checkOutMutation below).
//   - Pencil (edit): disabled once CHECKED_OUT (web: "Cannot edit
//     checked out guest").
//   - ••• (more options): hidden entirely once CANCELED — nothing left
//     to extend/change/revert/cancel. Its contents still vary further:
//     Extend stay (RESERVED/IN_HOUSE), Change room (IN_HOUSE only),
//     Revert checkout (CHECKED_OUT only), Cancel reservation (RESERVED
//     only). Email guest/Print invoice always show when the menu itself
//     does. None of neutralMenuItems()'s items actually route anywhere
//     yet (per design/design-reference/reservations.md) — this pass
//     fixes which options appear, not what tapping them does.
// Add charge/Record payment/Add visitor are NOT status-gated on the web
// either, so they stay available regardless of status here too.
// -----------------------------------------------------------------------

type Tab = 'guest' | 'charges' | 'others';

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function PencilIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Svg>
  );
}
function MoreIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Circle cx={5} cy={12} r={1.6} fill={colors.text} />
      <Circle cx={12} cy={12} r={1.6} fill={colors.text} />
      <Circle cx={19} cy={12} r={1.6} fill={colors.text} />
    </Svg>
  );
}
function MailIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4V6a1 1 0 0 1 1-1z" />
    </Svg>
  );
}
function PhoneIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 3a2 2 0 0 1-.5 2.1L8 10.1a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 2 .5 3 .7a2 2 0 0 1 1.6 2z" />
    </Svg>
  );
}
function PlusIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function CheckInIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}
function CheckOutIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m9 11 3 3L22 4" />
      <Path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11" />
    </Svg>
  );
}
function CancelActionIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

function formatShort(d: Date) {
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}
function formatNaira(amount: number) {
  return `NGN ${amount.toLocaleString('en-US')}`;
}

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}
function AddChargeIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function RecordPaymentIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 1v22" />
      <Path d="M17 5.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7" />
    </Svg>
  );
}
function InvoiceIcon() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 3h12v18l-2.5-1.6L13 21l-1-1.6L11 21l-2.5-1.6L6 21z" />
      <Path d="M9 8h6M9 12h6" />
    </Svg>
  );
}
function PrintIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={8} width={16} height={9} rx={1.5} />
      <Path d="M7 8V4h10v4" />
      <Path d="M7 15h10v5H7z" />
    </Svg>
  );
}
function EmailIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Path d="m3 7 9 6 9-6" />
    </Svg>
  );
}

const ACTIVITY_TONE_BG: Record<ActivityEntry['tone'], string> = {
  success: colors.successSoft,
  neutral: colors.bg,
  amber: colors.amberSoft,
  danger: colors.dangerSoft,
};
const ACTIVITY_TONE_COLOR: Record<ActivityEntry['tone'], string> = {
  success: colors.success,
  neutral: colors.textMuted,
  amber: colors.amber,
  danger: colors.danger,
};

function CheckInLogIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <Path d="M10 17l5-5-5-5" />
      <Path d="M15 12H3" />
    </Svg>
  );
}
function CheckOutLogIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m9 11 3 3L22 4" />
      <Path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11" />
    </Svg>
  );
}
function EditLogIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Svg>
  );
}
function PaymentLogIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={2} y={6} width={20} height={13} rx={2} />
      <Path d="M2 10h20" />
    </Svg>
  );
}
function ChargeLogIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 3h12v18l-2.5-1.6L13 21l-1-1.6L11 21l-2.5-1.6L6 21z" />
    </Svg>
  );
}
function VisitorLogIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M13 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx={7} cy={7} r={3.4} />
      <Path d="M19 8v6M22 11h-6" />
    </Svg>
  );
}
function InvoiceLogIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Path d="m3 7 9 6 9-6" />
    </Svg>
  );
}

function ActivityRow({ entry, isLast }: { entry: ActivityEntry; isLast: boolean }) {
  const bg = ACTIVITY_TONE_BG[entry.tone];
  const color = ACTIVITY_TONE_COLOR[entry.tone];
  return (
    <View style={[styles.activityRow, !isLast && styles.activityRowSpacing]}>
      {!isLast && <View style={styles.activityLine} />}
      <View style={[styles.activityIcon, { backgroundColor: bg }]}>
        {entry.icon === 'check-in' && <CheckInLogIcon color={color} />}
        {entry.icon === 'check-out' && <CheckOutLogIcon color={color} />}
        {entry.icon === 'edit' && <EditLogIcon color={color} />}
        {entry.icon === 'payment' && <PaymentLogIcon color={color} />}
        {entry.icon === 'charge' && <ChargeLogIcon color={color} />}
        {entry.icon === 'visitor' && <VisitorLogIcon color={color} />}
        {entry.icon === 'invoice' && <InvoiceLogIcon color={color} />}
      </View>
      <View style={styles.activityText}>
        <Text style={styles.activityTitle}>{entry.title}</Text>
        <Text style={styles.activitySubtitle}>
          {entry.actor} · {entry.timestamp}
        </Text>
      </View>
    </View>
  );
}

// Which neutral items show up depends on status, matching
// hms-frontend-react's CheckInDesc.js "more options" menu exactly:
// Extend stay for RESERVED/IN_HOUSE, Change room only once IN_HOUSE,
// Revert checkout only once CHECKED_OUT. Email guest/Print invoice show
// for every status this menu is reachable from at all (CANCELED hides
// the whole ••• trigger, see the topBarActions render above).
function neutralMenuItems(status: ReservationStatus): string[] {
  const items = ['Email guest', 'Print invoice'];
  if (status === 'RESERVED' || status === 'IN_HOUSE') items.push('Extend stay');
  if (status === 'IN_HOUSE') items.push('Change room');
  if (status === 'CHECKED_OUT') items.push('Revert checkout');
  return items;
}

function MoreMenuOverlay({
  visible,
  status,
  onClose,
  onRevertCheckout,
  onCancelReservation,
}: {
  visible: boolean;
  status: ReservationStatus;
  onClose: () => void;
  onRevertCheckout: () => void;
  onCancelReservation: () => void;
}) {
  if (!visible) return null;
  // TODO(nav): "Email guest"/"Print invoice"/"Extend stay"/"Change room"
  // don't open anything yet (per design/design-reference/reservations.md).
  // "Revert checkout" and "Cancel reservation" are real now — each opens
  // the same confirm-then-POST flow Check In/Check Out already use (see
  // ConfirmActionModal below).
  const items = neutralMenuItems(status);
  return (
    <>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close menu" />
      <View style={styles.moreMenuWrapper}>
        <View style={styles.moreMenuGroup}>
          {items.map((label, i) => (
            <Pressable
              key={label}
              style={[styles.moreMenuItem, i < items.length - 1 && styles.moreMenuItemDivider]}
              onPress={label === 'Revert checkout' ? onRevertCheckout : onClose}>
              <Text style={styles.moreMenuItemText}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {status === 'RESERVED' && (
          <View style={styles.moreMenuGroup}>
            <Pressable style={styles.moreMenuItem} onPress={onCancelReservation}>
              <Text style={styles.moreMenuDestructiveText}>Cancel reservation</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.moreMenuGroup}>
          <Pressable style={styles.moreMenuItem} onPress={onClose}>
            <Text style={styles.moreMenuCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

type ConfirmActionKind = 'check-in' | 'check-out' | 'revert-checkout' | 'cancel';

// One config per confirm-then-POST action this screen offers. Revert
// checkout/Cancel reservation reuse this same modal (and the same
// scrim+card layout Check In/Check Out already used) rather than each
// getting a bespoke dialog — all four are "confirm, no other input
// needed" actions per hms-backend-node's own endpoints (POST
// /:id/revert-checkout, /:id/cancel take no required body).
const CONFIRM_ACTION_META: Record<
  ConfirmActionKind,
  {
    icon: (color: string) => React.ReactNode;
    confirmIcon: React.ReactNode;
    tint: string;
    tintSoft: string;
    title: string;
    subtitle: (guestName: React.ReactNode, room: string) => React.ReactNode;
    confirmLabel: string;
  }
> = {
  'check-in': {
    icon: (color) => <CheckInLogIcon color={color} />,
    confirmIcon: <CheckInIcon />,
    tint: colors.navy,
    tintSoft: colors.navySoft,
    title: 'Check in this guest?',
    subtitle: (guestName, room) => (
      <>You&apos;re about to check in {guestName} into Room {room}.</>
    ),
    confirmLabel: 'Yes, check in',
  },
  'check-out': {
    icon: (color) => <CheckOutLogIcon color={color} />,
    confirmIcon: <CheckOutIcon />,
    tint: colors.coral,
    tintSoft: colors.coralSoft,
    title: 'Check out this guest?',
    subtitle: (guestName, room) => (
      <>You&apos;re about to check out {guestName} from Room {room}.</>
    ),
    confirmLabel: 'Yes, check out',
  },
  'revert-checkout': {
    icon: (color) => <CheckInLogIcon color={color} />,
    confirmIcon: <CheckInIcon />,
    tint: colors.navy,
    tintSoft: colors.navySoft,
    title: 'Revert checkout?',
    subtitle: (guestName, room) => (
      <>You&apos;re about to check {guestName} back into Room {room}.</>
    ),
    confirmLabel: 'Yes, revert checkout',
  },
  cancel: {
    icon: (color) => <CancelActionIcon color={color} />,
    confirmIcon: <CancelActionIcon color="#FFFFFF" />,
    tint: colors.danger,
    tintSoft: colors.dangerSoft,
    title: 'Cancel this reservation?',
    subtitle: (guestName, room) => (
      <>You&apos;re about to cancel the reservation for {guestName} in Room {room}.</>
    ),
    confirmLabel: 'Yes, cancel reservation',
  },
};

function ConfirmActionModal({
  visible,
  action,
  guestName,
  room,
  pending,
  errorMessage,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  action: ConfirmActionKind;
  guestName: string;
  room: string;
  pending: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onConfirm: (reason?: string) => void;
}) {
  // Only "cancel" takes a reason (matching CheckInDesc.js's optional
  // cancelReason textarea) — this component gets remounted with a fresh
  // `key` per confirmAction in the parent, so this always starts blank
  // for a new confirm flow rather than carrying over a previous one.
  const [reason, setReason] = useState('');
  if (!visible) return null;
  const meta = CONFIRM_ACTION_META[action];
  const boldGuestName = <Text style={styles.confirmSubtitleBold}>{guestName}</Text>;
  const showReasonField = action === 'cancel';

  return (
    <KeyboardAvoidingView
      style={StyleSheet.absoluteFill}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onCancel} accessibilityLabel="Cancel" />
      {/* A flex wrapper that pins the card to the bottom, rather than the
          card itself using position:absolute — a position:absolute child's
          `bottom` offset doesn't reliably respond to the paddingBottom
          KeyboardAvoidingView adds when the keyboard opens, which is why
          the reason field below was getting covered with nothing scrolling
          it into view. Flex + justifyContent:'flex-end' shrinks with the
          padded box instead, so the card actually moves up. */}
      <View style={styles.confirmCardWrapper} pointerEvents="box-none">
        <View style={styles.confirmCard}>
          <View style={[styles.confirmIconCircle, { backgroundColor: meta.tintSoft }]}>
            {meta.icon(meta.tint)}
          </View>
          <Text style={styles.confirmTitle}>{meta.title}</Text>
          <Text style={styles.confirmSubtitle}>{meta.subtitle(boldGuestName, room)}</Text>

          {showReasonField && (
            <View style={styles.confirmReasonField}>
              <Text style={styles.confirmReasonLabel}>
                REASON <Text style={styles.confirmReasonOptional}>optional</Text>
              </Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="e.g. Guest requested cancellation"
                placeholderTextColor={colors.textFaint}
                multiline
                editable={!pending}
                style={styles.confirmReasonInput}
              />
            </View>
          )}

          {errorMessage && <Text style={styles.confirmErrorText}>{errorMessage}</Text>}
          <View style={styles.confirmButtonRow}>
            <Pressable style={styles.confirmCancelButton} onPress={onCancel} disabled={pending}>
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmConfirmButton, { backgroundColor: meta.tint }, pending && { opacity: 0.6 }]}
              onPress={() => onConfirm(showReasonField ? reason.trim() || undefined : undefined)}
              disabled={pending}>
              {pending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  {meta.confirmIcon}
                  <Text style={styles.confirmConfirmText}>{meta.confirmLabel}</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function FolioRow({ entry, isLast }: { entry: FolioEntry; isLast: boolean }) {
  const isPayment = entry.kind === 'PAYMENT';
  return (
    <View style={[styles.folioRow, !isLast && styles.folioRowDivider]}>
      <View style={styles.folioRowText}>
        <View style={styles.folioRowTitleLine}>
          <Text style={styles.folioTitle}>{entry.title}</Text>
          {entry.badge && (
            <View style={styles.folioBadge}>
              <Text style={styles.folioBadgeText}>{entry.badge}</Text>
            </View>
          )}
        </View>
        <Text style={styles.folioSubtitle}>{entry.subtitle}</Text>
      </View>
      <Text style={[styles.folioAmount, isPayment && { color: colors.success }]}>
        {isPayment ? '− ' : ''}
        {formatNaira(entry.amount)}
      </Text>
    </View>
  );
}

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('guest');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionKind | null>(null);
  const queryClient = useQueryClient();
  const { data: reservations, isLoading } = useReservations();
  const reservation = reservations?.find((r) => r.id === id);
  const folioState = useReservationFolio(id);
  const activityState = useReservationActivity(id);
  const { data: customFieldDefs } = useCustomFields('RESERVATION');

  // Both just refetch the shared ['reservations'] query on success rather
  // than trying to merge their own response into it — checkIn()/checkOut()
  // in businesslogic/checkIn.js return the updated doc in two different
  // shapes (see src/api/reservations.ts), so a fresh authoritative read is
  // simpler and safer than reconciling both by hand.
  const invalidateActivity = useInvalidateReservationActivity();
  const checkInMutation = useMutation({
    mutationFn: () => checkInReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      invalidateActivity(id);
    },
  });
  const checkOutMutation = useMutation({
    mutationFn: () => checkOutReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      invalidateActivity(id);
      router.back();
    },
  });
  const revertCheckoutMutation = useMutation({
    mutationFn: () => revertCheckoutReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      invalidateActivity(id);
    },
  });
  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => cancelReservation(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      invalidateActivity(id);
      router.back();
    },
  });
  const confirmPending =
    checkInMutation.isPending ||
    checkOutMutation.isPending ||
    revertCheckoutMutation.isPending ||
    cancelMutation.isPending;
  const confirmError =
    checkInMutation.error?.message ??
    checkOutMutation.error?.message ??
    revertCheckoutMutation.error?.message ??
    cancelMutation.error?.message;

  if (isLoading) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  if (!reservation) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Reservation not found.</Text>
      </View>
    );
  }

  const status: ReservationStatus = reservation.status;
  const statusMeta = RESERVATION_STATUS_META[status];
  const isReserved = status === 'RESERVED';
  const isInHouse = status === 'IN_HOUSE';
  const isCheckedOut = status === 'CHECKED_OUT';
  const isCanceled = status === 'CANCELED';

  function handleConfirm(reason?: string) {
    if (confirmAction === 'check-in') {
      checkInMutation.mutate(undefined, { onSuccess: () => setConfirmAction(null) });
    } else if (confirmAction === 'check-out') {
      setConfirmAction(null);
      checkOutMutation.mutate();
    } else if (confirmAction === 'revert-checkout') {
      revertCheckoutMutation.mutate(undefined, { onSuccess: () => setConfirmAction(null) });
    } else if (confirmAction === 'cancel') {
      setConfirmAction(null);
      cancelMutation.mutate(reason);
    }
  }
  const nights = Math.round(
    (reservation.departureDate.getTime() - reservation.arrivalDate.getTime()) / (24 * 60 * 60 * 1000),
  );
  const stayLabel = `${formatShort(reservation.arrivalDate)}–${formatShort(reservation.departureDate)}`;
  const answeredCustomFields = pairCustomFieldValues(customFieldDefs ?? [], reservation.customFieldValues);

  const { folio, charged, paid, balance, isLoading: folioLoading, isError: folioError, error: folioErrorObj } = folioState;
  const hasFolio = folio.length > 0;
  const { activity, isLoading: activityLoading, isError: activityError, error: activityErrorObj } = activityState;

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackIcon />
        </Pressable>
        <View style={styles.topBarActions}>
          <Pressable
            style={[styles.iconButton, isCheckedOut && styles.iconButtonDisabled]}
            accessibilityLabel="Edit guest"
            disabled={isCheckedOut}
            onPress={() => router.push(`/edit-guest?id=${reservation.id}`)}>
            <PencilIcon />
          </Pressable>
          {/* Matches hms-frontend-react's CheckInDesc.js: the "more options"
              trigger itself only shows for RESERVED/IN_HOUSE/CHECKED_OUT —
              a canceled reservation has nothing left to extend, change
              room on, revert, or cancel again. */}
          {!isCanceled && (
            <Pressable
              style={styles.iconButton}
              accessibilityLabel="More options"
              onPress={() => setMoreMenuOpen(true)}>
              <MoreIcon />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.identityRow}>
        <View style={styles.identityText}>
          <Text style={styles.guestName} numberOfLines={1}>
            {reservation.guestName}
          </Text>
          <Text style={styles.identityMeta}>
            Room {reservation.room} · {getStayMetaText(reservation)}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
          <Text style={[styles.statusPillText, { color: statusMeta.text }]}>
            {statusMeta.label.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.segmentedControl}>
        {(
          [
            ['guest', 'Guest Info'],
            ['charges', 'Charges'],
            ['others', 'Others'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <Pressable
            key={key}
            style={[styles.segment, tab === key && styles.segmentActive]}
            onPress={() => setTab(key)}>
            <Text style={[styles.segmentText, tab === key && styles.segmentTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        {tab === 'guest' && (
          <>
            <View style={styles.contactCard}>
              <View style={styles.contactRow}>
                <View style={styles.contactIcon}>
                  <MailIcon />
                </View>
                <View style={styles.contactText}>
                  <Text style={styles.fieldLabel}>EMAIL</Text>
                  <Text style={styles.fieldValueSmall} numberOfLines={1}>
                    {reservation.email}
                  </Text>
                </View>
              </View>
              <View style={styles.contactDivider} />
              <View style={styles.contactRow}>
                <View style={styles.contactIcon}>
                  <PhoneIcon />
                </View>
                <View>
                  <Text style={styles.fieldLabel}>PHONE</Text>
                  <Text style={styles.fieldValue}>{reservation.phone}</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>STAY DETAILS</Text>
              <View style={styles.stayCard}>
                <View style={[styles.stayCell, styles.stayCellDivider]}>
                  <Text style={styles.fieldLabel}>ROOM</Text>
                  <Text style={[styles.fieldValue, styles.stayCellValue]}>{reservation.room}</Text>
                </View>
                <View style={[styles.stayCell, styles.stayCellDivider]}>
                  <Text style={styles.fieldLabel}>NIGHTS</Text>
                  <Text style={[styles.fieldValue, styles.stayCellValue]}>{nights}</Text>
                </View>
                <View style={[styles.stayCell, { flex: 1.4 }]}>
                  <Text style={styles.fieldLabel}>STAY</Text>
                  <Text style={[styles.fieldValue, styles.stayCellValue, styles.stayLabel]}>{stayLabel}</Text>
                </View>
              </View>
            </View>

            {answeredCustomFields.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>ADDITIONAL DETAILS</Text>
                <View style={styles.customDetailsGrid}>
                  {answeredCustomFields.map(({ field, value }) => (
                    <View key={field._id} style={styles.customDetailsItem}>
                      <Text style={styles.fieldLabel}>{field.label.toUpperCase()}</Text>
                      <Text style={styles.fieldValue}>{formatCustomFieldValue(field, value)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.additionalGuestsHeader}>
              <Text style={styles.sectionLabel}>ADDITIONAL GUESTS</Text>
              <Pressable style={styles.addLink} onPress={() => router.push(`/add-visitors?id=${reservation.id}`)}>
                <PlusIcon />
                <Text style={styles.addLinkText}>{isInHouse ? 'Add visitor' : 'Add'}</Text>
              </Pressable>
            </View>
            {reservation.additionalGuests.length === 0 ? (
              <View style={styles.emptyGuestsBox}>
                <Text style={styles.emptyGuestsText}>No additional guests on this stay</Text>
              </View>
            ) : (
              reservation.additionalGuests.map((name) => (
                <Text key={name} style={styles.fieldValue}>
                  {name}
                </Text>
              ))
            )}
          </>
        )}

        {tab === 'charges' && (
          <>
            <LinearGradient
              colors={['#3E52A3', colors.navy]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}>
              <Svg width={120} height={120} viewBox="0 0 120 120" style={styles.balanceRing}>
                <Circle cx={60} cy={60} r={60} fill="#5A6BC0" />
              </Svg>
              <View style={styles.balanceHeaderRow}>
                <Text style={styles.balanceLabel}>Outstanding balance</Text>
                <View style={[styles.balanceBadge, { backgroundColor: balance === 0 ? colors.success : colors.coral }]}>
                  {balance === 0 && <CheckIcon color="#FFFFFF" />}
                  <Text style={styles.balanceBadgeText}>{balance === 0 ? 'FULLY PAID' : 'BALANCE DUE'}</Text>
                </View>
              </View>
              <Text style={styles.balanceAmount}>{formatNaira(balance)}</Text>
              <View style={styles.balanceSplitRow}>
                <View style={styles.balanceSplitCell}>
                  <Text style={styles.balanceSplitLabel}>Charged</Text>
                  <Text style={styles.balanceSplitValue}>{formatNaira(charged)}</Text>
                </View>
                <View style={styles.balanceSplitDivider} />
                <View style={[styles.balanceSplitCell, { alignItems: 'flex-end' }]}>
                  <Text style={styles.balanceSplitLabel}>Paid</Text>
                  <Text style={styles.balanceSplitValue}>{formatNaira(paid)}</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.chargeActionsRow}>
              <Pressable
                style={styles.addChargeButton}
                onPress={() => router.push(`/add-charge?id=${reservation.id}`)}>
                <AddChargeIcon />
                <Text style={styles.addChargeButtonText}>Add charge</Text>
              </Pressable>
              <Pressable
                style={styles.recordPaymentButton}
                onPress={() => router.push(`/record-payment?id=${reservation.id}`)}>
                <RecordPaymentIcon />
                <Text style={styles.recordPaymentButtonText}>Record payment</Text>
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>FOLIO</Text>
              {folioLoading ? (
                <View style={styles.placeholderBox}>
                  <ActivityIndicator color={colors.navy} />
                </View>
              ) : folioError ? (
                <View style={styles.placeholderBox}>
                  <Text style={styles.placeholderText}>{folioErrorObj?.message}</Text>
                </View>
              ) : hasFolio ? (
                <View style={styles.folioCard}>
                  {folio.map((entry) => (
                    // Every entry gets a divider, including the last one —
                    // it separates it from the "Balance due" total row below.
                    <FolioRow key={entry.id} entry={entry} isLast={false} />
                  ))}
                  <View style={styles.folioTotalRow}>
                    <Text style={styles.folioTotalLabel}>Balance due</Text>
                    <Text style={styles.folioTotalValue}>{formatNaira(balance)}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyFolioBox}>
                  <InvoiceIcon />
                  <Text style={styles.emptyFolioTitle}>No charges yet</Text>
                  <Text style={styles.emptyFolioSubtitle}>
                    Add a charge or record a payment to start this guest&apos;s folio.
                  </Text>
                </View>
              )}
            </View>

            {hasFolio && (
              <View style={styles.invoiceActionsRow}>
                {/* TODO(nav): opens the native print sheet — not wired up. */}
                <Pressable style={styles.invoiceActionButton}>
                  <PrintIcon />
                  <Text style={styles.invoiceActionText}>Print invoice</Text>
                </Pressable>
                {/* TODO(nav): opens the native mail composer — not wired up. */}
                <Pressable style={styles.invoiceActionButton}>
                  <EmailIcon />
                  <Text style={styles.invoiceActionText}>Email invoice</Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        {tab === 'others' && (
          <>
            <Text style={styles.sectionLabel}>ACTIVITY</Text>
            {activityLoading ? (
              <View style={styles.placeholderBox}>
                <ActivityIndicator color={colors.navy} />
              </View>
            ) : activityError ? (
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderText}>{activityErrorObj?.message}</Text>
              </View>
            ) : activity.length === 0 ? (
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderText}>No activity recorded yet.</Text>
              </View>
            ) : (
              <View style={styles.activityList}>
                {activity.map((entry, i) => (
                  <ActivityRow key={entry.id} entry={entry} isLast={i === activity.length - 1} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Matches CheckInDesc.js on the web: CheckOutButton only shows once
          IN_HOUSE, CheckInGuestButton only while RESERVED — a CHECKED_OUT
          or CANCELED reservation has neither action available. */}
      {(isReserved || isInHouse) && (
        <View style={styles.footer}>
          <Pressable
            style={[styles.footerButton, { backgroundColor: isInHouse ? colors.coral : colors.navy }]}
            onPress={() => setConfirmAction(isInHouse ? 'check-out' : 'check-in')}>
            {isInHouse ? <CheckOutIcon /> : <CheckInIcon />}
            <Text style={styles.footerButtonText}>{isInHouse ? 'Check Out' : 'Check In'}</Text>
          </Pressable>
        </View>
      )}

      <MoreMenuOverlay
        visible={moreMenuOpen}
        status={status}
        onClose={() => setMoreMenuOpen(false)}
        onRevertCheckout={() => {
          setMoreMenuOpen(false);
          setConfirmAction('revert-checkout');
        }}
        onCancelReservation={() => {
          setMoreMenuOpen(false);
          setConfirmAction('cancel');
        }}
      />

      <ConfirmActionModal
        key={confirmAction ?? 'none'}
        visible={confirmAction !== null}
        action={confirmAction ?? 'check-in'}
        guestName={reservation.guestName}
        room={reservation.room}
        pending={confirmPending}
        errorMessage={confirmError}
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
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
  },
  notFoundText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  topBarActions: {
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
  iconButtonDisabled: {
    opacity: 0.4,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  identityText: {
    flexShrink: 1,
    gap: 6,
  },
  guestName: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 19,
    color: colors.navyInk,
  },
  identityMeta: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  statusPill: {
    flexShrink: 0,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  statusPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: 11,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 18,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  segmentActive: {
    backgroundColor: colors.navy,
  },
  segmentText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
  },
  contactCard: {
    backgroundColor: colors.bg,
    borderRadius: radii.card,
    padding: 18,
    paddingVertical: 16,
    gap: 14,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: {
    flexShrink: 1,
    minWidth: 0,
  },
  contactDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontFamily: fonts.headingBold,
    fontSize: 14.5,
    color: colors.navyInk,
  },
  fieldValueSmall: {
    fontFamily: fonts.headingBold,
    fontSize: 12.5,
    color: colors.navyInk,
  },
  section: {
    marginTop: 22,
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textFaint,
    letterSpacing: 0.6,
  },
  stayCard: {
    marginTop: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  stayCell: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  stayCellDivider: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  stayCellValue: {
    marginTop: 4,
  },
  stayLabel: {
    fontSize: 12,
  },
  customDetailsGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  customDetailsItem: {
    flexBasis: '45%',
    flexGrow: 1,
    gap: 4,
  },
  additionalGuestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  addLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  addLinkText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.navy,
  },
  emptyGuestsBox: {
    marginTop: 10,
    padding: 16,
    borderWidth: 1.4,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 13,
    alignItems: 'center',
  },
  emptyGuestsText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textFaint,
  },
  placeholderBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  placeholderText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  balanceCard: {
    borderRadius: radii.card,
    padding: 20,
    overflow: 'hidden',
  },
  balanceRing: {
    position: 'absolute',
    top: -40,
    right: -30,
    opacity: 0.22,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: '#C4CBEE',
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 11,
  },
  balanceBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9.5,
    color: '#FFFFFF',
  },
  balanceAmount: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 32,
    color: '#FFFFFF',
    marginTop: 8,
  },
  balanceSplitRow: {
    flexDirection: 'row',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.16)',
  },
  balanceSplitCell: {
    flex: 1,
  },
  balanceSplitDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  balanceSplitLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: '#B9C0E8',
  },
  balanceSplitValue: {
    fontFamily: fonts.headingBold,
    fontSize: 15,
    color: '#FFFFFF',
    marginTop: 2,
  },
  chargeActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  addChargeButton: {
    flex: 1,
    height: 46,
    borderRadius: radii.input,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  addChargeButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  recordPaymentButton: {
    flex: 1,
    height: 46,
    borderRadius: radii.input,
    backgroundColor: colors.successSoft,
    borderWidth: 1.4,
    borderColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  recordPaymentButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.success,
  },
  folioCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  folioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  folioRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  folioRowText: {
    flexShrink: 1,
    minWidth: 0,
  },
  folioRowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  folioTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.navyInk,
  },
  folioBadge: {
    backgroundColor: colors.successSoft,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  folioBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.success,
  },
  folioSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textFaint,
    marginTop: 2,
  },
  folioAmount: {
    flexShrink: 0,
    fontFamily: fonts.headingBold,
    fontSize: 13.5,
    color: colors.navyInk,
  },
  folioTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.bg,
  },
  folioTotalLabel: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 13.5,
    color: colors.navyInk,
  },
  folioTotalValue: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 15,
    color: colors.coral,
  },
  emptyFolioBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyFolioTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 13.5,
    color: colors.navyInk,
  },
  emptyFolioSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  invoiceActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  invoiceActionButton: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  invoiceActionText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.navy,
  },
  activityList: {
    marginTop: 14,
  },
  activityRow: {
    flexDirection: 'row',
    gap: 14,
    position: 'relative',
  },
  activityRowSpacing: {
    paddingBottom: 22,
  },
  activityLine: {
    position: 'absolute',
    left: 15,
    top: 32,
    bottom: -22,
    width: 1.4,
    backgroundColor: colors.border,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    zIndex: 1,
  },
  activityText: {
    flexShrink: 1,
    paddingTop: 2,
  },
  activityTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 13.5,
    color: colors.navyInk,
  },
  activitySubtitle: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textFaint,
    marginTop: 3,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    height: 50,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  footerButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  scrim: {
    backgroundColor: 'rgba(18,23,58,0.35)',
  },
  moreMenuWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    gap: 8,
  },
  moreMenuGroup: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  moreMenuItem: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  moreMenuItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  moreMenuItemText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.navyInk,
  },
  moreMenuDestructiveText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.coral,
  },
  moreMenuCloseText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.navyInk,
  },
  confirmCardWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  confirmCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#12173A',
    shadowOpacity: 0.28,
    shadowRadius: 44,
    shadowOffset: { width: 0, height: 20 },
    elevation: 12,
  },
  confirmIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 17,
    color: colors.navyInk,
    textAlign: 'center',
  },
  confirmSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19.5,
    marginTop: -8,
  },
  confirmSubtitleBold: {
    fontFamily: fonts.bodyBold,
    color: colors.navyInk,
  },
  confirmReasonField: {
    width: '100%',
    marginTop: -2,
    gap: 6,
  },
  confirmReasonLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textFaint,
    letterSpacing: 0.5,
    textAlign: 'left',
  },
  confirmReasonOptional: {
    fontFamily: fonts.bodyMedium,
    letterSpacing: 0,
    color: colors.textFaint,
  },
  confirmReasonInput: {
    height: 64,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.text,
    textAlignVertical: 'top',
  },
  confirmErrorText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
    color: colors.danger,
    textAlign: 'center',
    marginTop: -6,
  },
  confirmButtonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 6,
  },
  confirmCancelButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  confirmConfirmButton: {
    flex: 1.3,
    height: 48,
    borderRadius: radii.input,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  confirmConfirmText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});

