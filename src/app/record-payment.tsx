import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { z } from 'zod';

import { addPayment, type PaymentMethod as PaymentMethodType } from '@/api/reservation-activity';
import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { colors, fonts, radii } from '@/design/theme';
import { useInvalidateReservationActivity, useReservationFolio } from '@/hooks/use-reservation-activity';
import { useReservations } from '@/hooks/use-reservations';

// -----------------------------------------------------------------------
// RecordPayment.html, opened from the Charges tab's "Record payment"
// button. Per design/design-reference/reservations.md: "Record payment →
// back to Charges tab, balance reduced." Now talks to the real POST
// /check-ins/:id/payments (see src/api/reservation-activity.ts) — "Half" /
// "Full balance" quick-fill against the real balance from
// useReservationFolio() (same charges+payments fetch the Charges tab
// uses), not a locally-computed one.
//
// Amount/reference/note go through react-hook-form + zod; payment method
// stays a plain tile-select, same convention as add-charge.tsx's category.
// -----------------------------------------------------------------------

const paymentFormSchema = z.object({
  amount: z.string().refine((v) => parseFloat(v) > 0, { error: 'Enter an amount greater than zero' }),
  reference: z.string().optional(),
  note: z.string().optional(),
});
type PaymentFormValues = z.infer<typeof paymentFormSchema>;

type PaymentMethodOption = {
  key: PaymentMethodType;
  label: string;
  icon: (color: string) => React.ReactNode;
};

const METHODS: PaymentMethodOption[] = [
  {
    key: 'POS',
    label: 'POS',
    icon: (color) => (
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Rect x={2} y={5} width={20} height={14} rx={2} />
        <Path d="M2 10h20" />
      </Svg>
    ),
  },
  {
    key: 'CASH',
    label: 'Cash',
    icon: (color) => (
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Rect x={2} y={6} width={20} height={13} rx={2} />
        <Path d="M2 10h20" />
      </Svg>
    ),
  },
  {
    key: 'ONLINE',
    label: 'Online',
    icon: (color) => (
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={12} cy={12} r={9} />
        <Path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </Svg>
    ),
  },
  {
    key: 'BANK_TRANSFER',
    label: 'Bank transfer',
    icon: (color) => (
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M7 7h13l-3-3M17 17H4l3 3" />
      </Svg>
    ),
  },
];

function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

function formatNaira(amount: number) {
  return `NGN ${amount.toLocaleString('en-US')}`;
}

export default function RecordPaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: reservations, isLoading } = useReservations();
  const reservation = reservations?.find((r) => r.id === id);
  const { balance: balanceDue, isLoading: folioLoading } = useReservationFolio(id);
  const [method, setMethod] = useState<PaymentMethodType | null>(null);
  const invalidateActivity = useInvalidateReservationActivity();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: { amount: '', reference: '', note: '' },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: (values: PaymentFormValues) =>
      addPayment(id, {
        amount: parseFloat(values.amount),
        method: method as PaymentMethodType,
        reference: values.reference || undefined,
        note: values.note || undefined,
      }),
    onSuccess: () => {
      invalidateActivity(id);
      router.back();
    },
  });

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

  function onSubmit(values: PaymentFormValues) {
    if (!method) return;
    recordPaymentMutation.mutate(values);
  }

  const canSubmit = method !== null;

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Record payment</Text>
          <Text style={styles.headerSubtitle}>
            {reservation.guestName} · Room {reservation.room}
          </Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <CloseIcon />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current balance due</Text>
          {folioLoading ? (
            <ActivityIndicator color={colors.coral} style={styles.balanceLoading} />
          ) : (
            <Text style={styles.balanceValue}>{formatNaira(balanceDue)}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.sectionLabel}>AMOUNT</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencyPrefix}>NGN</Text>
            <Controller
              control={control}
              name="amount"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="0.00"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                  style={styles.amountInput}
                />
              )}
            />
          </View>
          {errors.amount && <Text style={styles.fieldError}>{errors.amount.message}</Text>}
          <View style={styles.quickFillRow}>
            <Pressable
              style={styles.quickFillButton}
              disabled={folioLoading}
              onPress={() => setValue('amount', String(Math.round(balanceDue / 2)))}>
              <Text style={styles.quickFillText}>Half</Text>
            </Pressable>
            <Pressable
              style={styles.quickFillButton}
              disabled={folioLoading}
              onPress={() => setValue('amount', String(balanceDue))}>
              <Text style={styles.quickFillText}>Full balance</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
          <View style={styles.methodGrid}>
            {METHODS.map((m) => {
              const active = method === m.key;
              return (
                <Pressable
                  key={m.key}
                  style={[styles.methodTile, active && styles.methodTileActive]}
                  onPress={() => setMethod(m.key)}>
                  <View style={[styles.methodIcon, active && styles.methodIconActive]}>
                    {m.icon(active ? '#FFFFFF' : colors.navy)}
                  </View>
                  <Text style={[styles.methodLabel, active && styles.methodLabelActive]}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.sectionLabel}>
            REFERENCE <Text style={styles.sectionLabelOptional}>optional</Text>
          </Text>
          <Controller
            control={control}
            name="reference"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="e.g. transaction ID or receipt no."
                placeholderTextColor={colors.textFaint}
                style={styles.input}
              />
            )}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.sectionLabel}>
            NOTE <Text style={styles.sectionLabelOptional}>optional</Text>
          </Text>
          <Controller
            control={control}
            name="note"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Any other details"
                placeholderTextColor={colors.textFaint}
                multiline
                style={styles.noteInput}
              />
            )}
          />
        </View>

        {recordPaymentMutation.isError && (
          <Text style={styles.submitErrorText}>{recordPaymentMutation.error.message}</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={recordPaymentMutation.isPending}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.submitButton, canSubmit && styles.submitButtonActive]}
          disabled={!canSubmit || recordPaymentMutation.isPending}
          onPress={handleSubmit(onSubmit)}>
          {recordPaymentMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.submitButtonText, canSubmit && styles.submitButtonTextActive]}>
              Record payment
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardSafeView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 18,
    color: colors.navyInk,
  },
  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  balanceCard: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  balanceLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.textMuted,
  },
  balanceValue: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 24,
    color: colors.coral,
    marginTop: 4,
  },
  balanceLoading: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textFaint,
    letterSpacing: 0.6,
  },
  sectionLabelOptional: {
    fontFamily: fonts.bodyMedium,
    textTransform: 'none',
    letterSpacing: 0,
    color: colors.textFaint,
  },
  fieldError: {
    marginTop: 6,
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.danger,
  },
  submitErrorText: {
    marginTop: 16,
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
    color: colors.danger,
    textAlign: 'center',
  },
  field: {
    marginTop: 22,
  },
  amountRow: {
    marginTop: 8,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyPrefix: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  amountInput: {
    flex: 1,
    height: '100%',
    paddingLeft: 8,
    fontFamily: fonts.headingBold,
    fontSize: 16,
    color: colors.navyInk,
  },
  quickFillRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  quickFillButton: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickFillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.navy,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  methodTile: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.4,
    borderColor: colors.border,
  },
  methodTileActive: {
    borderWidth: 1.6,
    borderColor: colors.navy,
    backgroundColor: colors.navySoft,
  },
  methodIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconActive: {
    backgroundColor: colors.navy,
  },
  methodLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.navyInk,
  },
  methodLabelActive: {
    color: colors.navy,
  },
  input: {
    marginTop: 8,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.text,
  },
  noteInput: {
    marginTop: 8,
    height: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.text,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonActive: {
    backgroundColor: colors.navy,
    shadowColor: colors.navy,
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  submitButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textFaint,
  },
  submitButtonTextActive: {
    color: '#FFFFFF',
  },
});
