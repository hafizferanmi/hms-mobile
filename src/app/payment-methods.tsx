import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { PaymentMethodCategory, PaymentMethodDto } from '@/api/payment-methods';

import {
  PAYMENT_METHOD_CATEGORY_LABEL,
  PAYMENT_METHOD_CATEGORY_META,
  PAYMENT_METHOD_CATEGORY_ORDER,
} from '@/constants/payment-methods';
import { colors, fonts } from '@/design/theme';
import {
  useAddPaymentMethod,
  useDeletePaymentMethod,
  usePaymentMethods,
  useReorderPaymentMethods,
  useUpdatePaymentMethod,
} from '@/hooks/use-payment-methods';

// -----------------------------------------------------------------------
// Settings > Payment Methods — end to end against the real backend (see
// hms-backend-node's models/paymentMethod.js + businesslogic/
// paymentMethod.js + routes/paymentMethod.js). Deliberately doesn't touch
// record-payment.tsx or anywhere else a payment method is currently
// recorded/shown — this is only the settings screen that manages this new,
// per-company-configurable list; wiring the actual payment-taking flow to
// read from it is a separate, later change.
//
// One deliberate deviation from the mockup: reordering is done with
// move-up/move-down buttons on each available row instead of a long-press
// drag handle. A real drag gesture is possible (react-native-gesture-
// handler/-reanimated are already installed) but doing it well — smooth
// auto-scroll, correct gesture-arena handoff with the screen's own
// ScrollView, a11y — is a substantially bigger, higher-risk build than
// this pass, and PUT /payment-methods/reorder doesn't care how the client
// arrived at the new order either way. Worth a real drag interaction as a
// follow-up if the up/down buttons feel clunky in practice.
// -----------------------------------------------------------------------

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function InfoIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.2}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 11v5" strokeLinecap="round" />
      <Circle cx={12} cy={8} r={0.9} fill={colors.navy} stroke="none" />
    </Svg>
  );
}
function ChevronUpIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 15l6-6 6 6" />
    </Svg>
  );
}
function ChevronDownIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
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
function PlusIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

// One glyph per category — matches the mockup's own icon choice exactly.
function CategoryIcon({ category, color }: { category: PaymentMethodCategory; color: string }) {
  switch (category) {
    case 'CASH':
      return (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={2} y={6} width={20} height={12} rx={2.5} />
          <Circle cx={12} cy={12} r={2.6} />
        </Svg>
      );
    case 'CARD':
      return (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={2} y={5} width={20} height={14} rx={2.5} />
          <Path d="M2 10h20" strokeLinecap="round" />
        </Svg>
      );
    case 'BANK_TRANSFER':
      return (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 10 12 4l9 6" />
          <Path d="M5 10v9M10 10v9M14 10v9M19 10v9" strokeLinecap="round" />
          <Path d="M3 19h18" />
        </Svg>
      );
    case 'PAYMENT_GATEWAY':
      return (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill={color}>
          <Path d="M13 2 4 13h6l-1 9 9-11h-6z" />
        </Svg>
      );
    case 'OTA_CHANNEL':
      return (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}>
          <Circle cx={12} cy={12} r={9} />
          <Path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3z" />
        </Svg>
      );
    case 'DIGITAL_WALLET':
      return (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={2.5} y={6} width={19} height={13} rx={2.5} />
          <Path d="M2.5 10h19" />
          <Circle cx={17.5} cy={14} r={1.1} fill={color} stroke="none" />
        </Svg>
      );
  }
}

function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <Pressable
      style={[styles.toggle, { backgroundColor: on ? colors.success : '#E2E4EF' }]}
      onPress={onToggle}
      hitSlop={6}>
      <View style={[styles.toggleKnob, on ? styles.toggleKnobOn : styles.toggleKnobOff]} />
    </Pressable>
  );
}

function PaymentMethodRow({
  method,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onToggle,
  onPress,
}: {
  method: PaymentMethodDto;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onToggle: () => void;
  onPress: () => void;
}) {
  const meta = PAYMENT_METHOD_CATEGORY_META[method.category];
  const showMoveButtons = !!(onMoveUp || onMoveDown);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      {showMoveButtons && (
        <View style={styles.moveButtons}>
          <Pressable disabled={!canMoveUp} onPress={onMoveUp} hitSlop={6}>
            <ChevronUpIcon color={canMoveUp ? colors.textMuted : colors.border} />
          </Pressable>
          <Pressable disabled={!canMoveDown} onPress={onMoveDown} hitSlop={6}>
            <ChevronDownIcon color={canMoveDown ? colors.textMuted : colors.border} />
          </Pressable>
        </View>
      )}
      <View style={[styles.iconChip, { backgroundColor: method.enabled ? meta.soft : colors.bg }]}>
        <CategoryIcon category={method.category} color={method.enabled ? meta.color : colors.textFaint} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowName, !method.enabled && styles.rowNameMuted]} numberOfLines={1}>
          {method.name}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {PAYMENT_METHOD_CATEGORY_LABEL[method.category]}
        </Text>
      </View>
      <ToggleSwitch on={method.enabled} onToggle={onToggle} />
    </Pressable>
  );
}

function MethodFormSheet({
  visible,
  method,
  submitting,
  deleting,
  onClose,
  onSubmit,
  onDelete,
}: {
  visible: boolean;
  method: PaymentMethodDto | null;
  submitting: boolean;
  deleting: boolean;
  onClose: () => void;
  onSubmit: (values: { name: string; category: PaymentMethodCategory }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(method?.name ?? '');
  const [category, setCategory] = useState<PaymentMethodCategory>(method?.category ?? 'CASH');
  const [prevMethodId, setPrevMethodId] = useState(method?._id ?? null);

  // Re-seeds the form whenever a *different* method is opened for editing
  // (or "Add method" is opened after an edit) — adjusted during render
  // rather than in a useEffect, same pattern used elsewhere in this app
  // for syncing local form state to a prop that can change while mounted.
  const currentMethodId = method?._id ?? null;
  if (currentMethodId !== prevMethodId) {
    setPrevMethodId(currentMethodId);
    setName(method?.name ?? '');
    setCategory(method?.category ?? 'CASH');
  }

  if (!visible) return null;

  const isEdit = !!method;
  const canSubmit = name.trim().length > 0;

  return (
    <>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{isEdit ? 'Edit method' : 'Add method'}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <CloseIcon />
          </Pressable>
        </View>

        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Flutterwave"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.chipGrid}>
            {PAYMENT_METHOD_CATEGORY_ORDER.map((c) => {
              const meta = PAYMENT_METHOD_CATEGORY_META[c];
              const active = category === c;
              return (
                <Pressable
                  key={c}
                  style={[styles.chip, { backgroundColor: active ? meta.soft : colors.surface, borderColor: active ? meta.color : colors.border }]}
                  onPress={() => setCategory(c)}>
                  <Text style={[styles.chipLabel, { color: active ? meta.color : colors.textMuted }]}>
                    {PAYMENT_METHOD_CATEGORY_LABEL[c]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {isEdit && (
            <Pressable style={styles.deleteRow} onPress={onDelete} disabled={deleting}>
              {deleting ? <ActivityIndicator color={colors.danger} size="small" /> : <Text style={styles.deleteRowText}>Delete method</Text>}
            </Pressable>
          )}
        </ScrollView>

        <Pressable
          style={[styles.saveButton, !canSubmit && styles.saveButtonDisabled]}
          disabled={!canSubmit || submitting}
          onPress={() => onSubmit({ name: name.trim(), category })}>
          {submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveButtonText}>{isEdit ? 'Save changes' : 'Add method'}</Text>}
        </Pressable>
      </View>
    </>
  );
}

export default function PaymentMethodsScreen() {
  const insets = useSafeAreaInsets();
  const { data: methods, isLoading, refetch } = usePaymentMethods();
  const updateMutation = useUpdatePaymentMethod();
  const reorderMutation = useReorderPaymentMethods();
  const addMutation = useAddPaymentMethod();
  const deleteMutation = useDeletePaymentMethod();

  const [refreshing, setRefreshing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethodDto | null>(null);

  const available = useMemo(
    () => (methods ?? []).filter((m) => m.enabled).sort((a, b) => a.order - b.order),
    [methods],
  );
  const hidden = useMemo(() => (methods ?? []).filter((m) => !m.enabled), [methods]);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function handleToggle(method: PaymentMethodDto) {
    updateMutation.mutate({ paymentMethodId: method._id, payload: { enabled: !method.enabled } });
  }

  function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= available.length) return;
    const next = [...available];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    reorderMutation.mutate(next.map((m) => m._id));
  }

  function openAdd() {
    setEditingMethod(null);
    setFormOpen(true);
  }

  function openEdit(method: PaymentMethodDto) {
    setEditingMethod(method);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingMethod(null);
  }

  function handleSubmitForm(values: { name: string; category: PaymentMethodCategory }) {
    if (editingMethod) {
      updateMutation.mutate(
        { paymentMethodId: editingMethod._id, payload: values },
        { onSuccess: closeForm },
      );
    } else {
      addMutation.mutate(values, { onSuccess: closeForm });
    }
  }

  function handleDelete() {
    if (!editingMethod) return;
    const method = editingMethod;
    Alert.alert('Delete payment method', `Remove "${method.name}" from checkout options? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(method._id, { onSuccess: closeForm }),
      },
    ]);
  }

  const totalCount = methods?.length ?? 0;
  const enabledCount = available.length;
  const formSubmitting = addMutation.isPending || updateMutation.isPending;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <BackIcon />
          </Pressable>
          <Text style={styles.headerTitle}>Payment Methods</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {enabledCount} of {totalCount} methods enabled
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.navy} colors={[colors.navy]} />}>
        <View style={styles.banner}>
          <InfoIcon />
          <Text style={styles.bannerText}>
            Use the up/down arrows to reorder how methods appear at checkout. Use the switch to hide a method
            without deleting it.
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.navy} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.eyebrow}>Available · shown at checkout, in this order</Text>
            <View style={styles.card}>
              {available.map((method, index) => (
                <PaymentMethodRow
                  key={method._id}
                  method={method}
                  canMoveUp={index > 0}
                  canMoveDown={index < available.length - 1}
                  onMoveUp={() => handleMove(index, -1)}
                  onMoveDown={() => handleMove(index, 1)}
                  onToggle={() => handleToggle(method)}
                  onPress={() => openEdit(method)}
                />
              ))}
              {available.length === 0 && <Text style={styles.emptyText}>No methods enabled — checkout has nothing to show.</Text>}
            </View>

            {hidden.length > 0 && (
              <>
                <Text style={styles.eyebrow}>Hidden · not shown at checkout</Text>
                <View style={styles.card}>
                  {hidden.map((method) => (
                    <PaymentMethodRow
                      key={method._id}
                      method={method}
                      canMoveUp={false}
                      canMoveDown={false}
                      onToggle={() => handleToggle(method)}
                      onPress={() => openEdit(method)}
                    />
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <Pressable style={[styles.fab, { bottom: insets.bottom + 24 }]} onPress={openAdd}>
        <PlusIcon />
        <Text style={styles.fabText}>Add method</Text>
      </Pressable>

      <MethodFormSheet
        visible={formOpen}
        method={editingMethod}
        submitting={formSubmitting}
        deleting={deleteMutation.isPending}
        onClose={closeForm}
        onSubmit={handleSubmitForm}
        onDelete={handleDelete}
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
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
    marginLeft: 32,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  banner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.navySoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  bannerText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.navy,
  },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textFaint,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 22,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textFaint,
    padding: 16,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  moveButtons: {
    gap: 2,
    flexShrink: 0,
  },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.text,
  },
  rowNameMuted: {
    color: colors.textMuted,
  },
  rowSub: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  toggle: {
    width: 42,
    height: 25,
    borderRadius: 13,
    flexShrink: 0,
  },
  toggleKnob: {
    position: 'absolute',
    top: 2.5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: colors.navyInk,
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  toggleKnobOn: {
    left: 19.5,
  },
  toggleKnobOff: {
    left: 2.5,
  },
  fab: {
    position: 'absolute',
    right: 18,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.navy,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
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
    maxHeight: '85%',
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
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 16,
    color: colors.navyInk,
  },
  sheetScroll: {
    maxHeight: 380,
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.text,
    marginBottom: 18,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
  },
  deleteRow: {
    marginTop: 22,
    alignItems: 'center',
    paddingVertical: 10,
  },
  deleteRowText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.danger,
  },
  saveButton: {
    marginTop: 16,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
