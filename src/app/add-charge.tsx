import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { z } from 'zod';

import { addCharge, type ChargeCategory } from '@/api/reservation-activity';
import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { colors, fonts, radii } from '@/design/theme';
import { useInvalidateReservationActivity } from '@/hooks/use-reservation-activity';
import { useReservations } from '@/hooks/use-reservations';

// -----------------------------------------------------------------------
// AddCharge.html, opened from the Charges tab's "Add charge" button. Per
// design/design-reference/reservations.md: "Add charge → back to Charges
// tab, now showing ReservationChargesFilled.html." Now talks to the real
// POST /check-ins/:id/charges (see src/api/reservation-activity.ts).
//
// Description and amount go through react-hook-form + zod, matching
// hms-backend-node's own ReservationChargeSchema (both required, amount
// positive). Category stays a plain tile-select, same convention as
// edit-guest.tsx's room picker — its "validation" is really just
// requiring one be chosen, enforced via canSubmit like before.
//
// The mockup shows "Laundry" pre-selected as the default category with the
// submit button still disabled (only the empty amount is blocking it). I
// started with no category pre-selected instead — requiring an explicit
// choice felt like better form UX than silently defaulting one — so here
// the button is disabled until both a category and a positive amount are
// set.
// -----------------------------------------------------------------------

const chargeFormSchema = z.object({
  description: z.string().min(1, { error: 'Description is required' }),
  amount: z.string().refine((v) => parseFloat(v) > 0, { error: 'Enter an amount greater than zero' }),
  note: z.string().optional(),
});
type ChargeFormValues = z.infer<typeof chargeFormSchema>;

type Category = {
  key: ChargeCategory;
  label: string;
  icon: (color: string) => React.ReactNode;
};

const CATEGORIES: Category[] = [
  {
    key: 'ROOM',
    label: 'Room',
    icon: (color) => (
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
        <Path d="M3 18h18M5 10V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4" />
      </Svg>
    ),
  },
  {
    key: 'LAUNDRY',
    label: 'Laundry',
    icon: (color) => (
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Rect x={5} y={2} width={14} height={20} rx={2} />
        <Path d="M9 6h6M9 10h6M9 14h3" />
      </Svg>
    ),
  },
  {
    key: 'ROOM_SERVICE',
    label: 'Room service',
    icon: (color) => (
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 12h18M12 3a9 9 0 0 1 9 9M12 3a9 9 0 0 0-9 9" />
      </Svg>
    ),
  },
  {
    key: 'MINIBAR',
    label: 'Minibar',
    icon: (color) => (
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Rect x={6} y={2} width={12} height={20} rx={2} />
        <Path d="M10 8h4" />
      </Svg>
    ),
  },
  {
    key: 'PENALTY',
    label: 'Penalty',
    icon: (color) => (
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M10.3 3.9 1.8 18a1.5 1.5 0 0 0 1.3 2.3h17.8a1.5 1.5 0 0 0 1.3-2.3L13.7 3.9a1.5 1.5 0 0 0-2.6 0z" />
        <Path d="M12 9v4M12 16.5v.1" />
      </Svg>
    ),
  },
  {
    key: 'COMMISSION',
    label: 'Commission',
    icon: (color) => (
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={12} cy={12} r={9} />
        <Path d="M12 7v10M9.5 9.5a2.5 2.5 0 0 1 2.5-1c1.4 0 2.5.7 2.5 2s-1.1 1.5-2.5 2c-1.4.5-2.5.7-2.5 2s1.1 2 2.5 2a2.5 2.5 0 0 0 2.5-1" />
      </Svg>
    ),
  },
  {
    key: 'OTHER',
    label: 'Other',
    icon: (color) => (
      <Svg width={14} height={14} viewBox="0 0 24 24">
        <Circle cx={5} cy={12} r={1.4} fill={color} />
        <Circle cx={12} cy={12} r={1.4} fill={color} />
        <Circle cx={19} cy={12} r={1.4} fill={color} />
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

export default function AddChargeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: reservations, isLoading } = useReservations();
  const reservation = reservations?.find((r) => r.id === id);
  const [category, setCategory] = useState<ChargeCategory | null>(null);
  const invalidateActivity = useInvalidateReservationActivity();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ChargeFormValues>({
    resolver: zodResolver(chargeFormSchema),
    defaultValues: { description: '', amount: '', note: '' },
  });

  const addChargeMutation = useMutation({
    mutationFn: (values: ChargeFormValues) =>
      addCharge(id, {
        category: category as ChargeCategory,
        description: values.description,
        amount: parseFloat(values.amount),
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

  function onSubmit(values: ChargeFormValues) {
    if (!category) return;
    addChargeMutation.mutate(values);
  }

  const canSubmit = category !== null;

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Add charge</Text>
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
        <Text style={styles.sectionLabel}>CATEGORY</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const active = category === cat.key;
            return (
              <Pressable
                key={cat.key}
                style={[styles.categoryTile, active && styles.categoryTileActive]}
                onPress={() => setCategory(cat.key)}>
                <View style={[styles.categoryIcon, active && styles.categoryIconActive]}>
                  {cat.icon(active ? '#FFFFFF' : colors.navy)}
                </View>
                <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{cat.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.field}>
          <Text style={styles.sectionLabel}>DESCRIPTION</Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="e.g. Laundry service — 3 items"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
              />
            )}
          />
          {errors.description && <Text style={styles.fieldError}>{errors.description.message}</Text>}
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

        {addChargeMutation.isError && (
          <Text style={styles.submitErrorText}>{addChargeMutation.error.message}</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cancelButton} onPress={() => router.back()} disabled={addChargeMutation.isPending}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.submitButton, canSubmit && styles.submitButtonActive]}
          disabled={!canSubmit || addChargeMutation.isPending}
          onPress={handleSubmit(onSubmit)}>
          {addChargeMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.submitButtonText, canSubmit && styles.submitButtonTextActive]}>Add charge</Text>
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  categoryTile: {
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
  categoryTileActive: {
    borderWidth: 1.6,
    borderColor: colors.navy,
    backgroundColor: colors.navySoft,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconActive: {
    backgroundColor: colors.navy,
  },
  categoryLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.navyInk,
  },
  categoryLabelActive: {
    color: colors.navy,
  },
  field: {
    marginTop: 18,
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
