import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { z } from 'zod';

import { addRoomType, getRoomType, updateRoomType } from '@/api/rooms';
import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { colors, fonts, radii, shadow } from '@/design/theme';

// -----------------------------------------------------------------------
// AddRoomType.html — define a new room type and how it's priced. Also
// doubles as "Edit room type" (opened from room-type/[id].tsx's
// RoomTypeActionsMenu with ?id=<roomTypeId>) since PUT /room-types/:id
// takes the same payload as POST — same reuse decision as add-staff.tsx.
//
// The mockup's FIXED/FLEXIBLE toggle only ever shows a single "PRICE PER
// NIGHT" field — it never designs the FLEXIBLE case's real shape
// (hms-backend-node requires one price per guest count, 1..
// maxNumberOfGuest — see roomTypeSchema.js). The per-guest-count price
// list below is this screen's own necessary extension of that toggle,
// not part of the original design.
// -----------------------------------------------------------------------

const priceModelSchema = z.enum(['FIXED', 'FLEXIBLE']);

const roomTypeFormSchema = z
  .object({
    name: z.string().min(1, { error: 'Type name is required' }),
    desc: z.string().optional(),
    maxNumberOfGuest: z.number().min(1).max(20),
    priceModel: priceModelSchema,
    price: z.string().optional(),
    flexiblePrices: z.array(z.string()).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.priceModel === 'FIXED') {
      const n = Number(values.price);
      if (!values.price || Number.isNaN(n) || n <= 0) {
        ctx.addIssue({ code: 'custom', path: ['price'], message: 'Enter a price per night' });
      }
    } else {
      const prices = values.flexiblePrices ?? [];
      prices.forEach((p, i) => {
        const n = Number(p);
        if (!p || Number.isNaN(n) || n <= 0) {
          ctx.addIssue({ code: 'custom', path: ['flexiblePrices', i], message: 'Required' });
        }
      });
    }
  });
type RoomTypeFormValues = z.infer<typeof roomTypeFormSchema>;

function makeFlexiblePrices(count: number, existing: string[] = []) {
  return Array.from({ length: count }, (_, i) => existing[i] ?? '');
}

function BedIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
      <Path d="M3 18h18M5 10V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4" />
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
function CheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function SquareIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.5}>
      <Rect x={4} y={4} width={16} height={16} rx={3} />
    </Svg>
  );
}
function TrendIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 17l6-6 4 4 8-8" />
    </Svg>
  );
}

export default function AddRoomTypeScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const queryClient = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ['room-type', id],
    // Non-null: `enabled: isEdit` guarantees this only runs once `id` is
    // actually set.
    queryFn: () => getRoomType(id!),
    enabled: isEdit,
  });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<RoomTypeFormValues>({
    resolver: zodResolver(roomTypeFormSchema),
    defaultValues: {
      name: '',
      desc: '',
      maxNumberOfGuest: 1,
      priceModel: 'FIXED',
      price: '',
      flexiblePrices: makeFlexiblePrices(1),
    },
  });

  useEffect(() => {
    if (existing) {
      const { type } = existing;
      const maxGuests = type.maxNumberOfGuest ?? 1;
      reset({
        name: type.name,
        desc: type.desc ?? '',
        maxNumberOfGuest: maxGuests,
        priceModel: type.priceModel,
        price: type.price ? String(type.price) : '',
        flexiblePrices: makeFlexiblePrices(
          maxGuests,
          (type.flexiblePrice ?? []).map((p) => String(p.price)),
        ),
      });
    }
  }, [existing, reset]);

  const maxNumberOfGuest = useWatch({ control, name: 'maxNumberOfGuest' });
  const priceModel = useWatch({ control, name: 'priceModel' });

  // Keeps the per-guest-count price list in sync whenever the guest-count
  // stepper changes, preserving already-typed values for counts that
  // still exist. No useFieldArray needed — this array's length is fully
  // derived from the stepper, never freely added/removed by the user, so
  // a plain string[] field addressed by index is enough.
  useEffect(() => {
    setValue('flexiblePrices', makeFlexiblePrices(maxNumberOfGuest, getValues('flexiblePrices')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxNumberOfGuest]);

  const mutation = useMutation({
    mutationFn: (values: RoomTypeFormValues) => {
      const payload = {
        name: values.name,
        desc: values.desc || undefined,
        maxNumberOfGuest: values.maxNumberOfGuest,
        priceModel: values.priceModel,
        ...(values.priceModel === 'FIXED'
          ? { price: Number(values.price) }
          : { flexiblePrice: (values.flexiblePrices ?? []).map((p) => ({ price: Number(p) })) }),
      };
      return isEdit ? updateRoomType(id, payload) : addRoomType(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-types'] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ['room-type', id] });
      router.back();
    },
  });

  function onSubmit(values: RoomTypeFormValues) {
    mutation.mutate(values);
  }

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <BedIcon />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{isEdit ? 'Edit room type' : 'Add room type'}</Text>
            <Text style={styles.headerSubtitle}>
              {isEdit ? 'Update this room type and its pricing' : 'Define a new type of room and how it’s priced'}
            </Text>
          </View>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <CloseIcon />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.fieldLabel}>TYPE NAME</Text>
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="e.g. Deluxe Double"
              placeholderTextColor={colors.textFaint}
              style={styles.inputPrimary}
            />
          )}
        />
        {errors.name && <Text style={styles.fieldError}>{errors.name.message}</Text>}

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>DESCRIPTION</Text>
          <Controller
            control={control}
            name="desc"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="A short description guests and staff will see"
                placeholderTextColor={colors.textFaint}
                multiline
                style={styles.textArea}
              />
            )}
          />
        </View>

        <View style={styles.sectionHead}>
          <View style={styles.sectionIcon}>
            <Text style={styles.sectionIconText}>$</Text>
          </View>
          <Text style={styles.sectionTitle}>Pricing</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>MAX NO. OF GUEST(S)</Text>
          <View style={styles.stepperRow}>
            <Controller
              control={control}
              name="maxNumberOfGuest"
              render={({ field: { value, onChange } }) => (
                <View style={styles.stepper}>
                  <Pressable style={styles.stepperButton} onPress={() => onChange(Math.max(1, value - 1))}>
                    <Text style={styles.stepperButtonText}>−</Text>
                  </Pressable>
                  <Text style={styles.stepperValue}>{value}</Text>
                  <Pressable style={styles.stepperButton} onPress={() => onChange(Math.min(20, value + 1))}>
                    <Text style={styles.stepperButtonText}>+</Text>
                  </Pressable>
                </View>
              )}
            />
            <Text style={styles.stepperHelp}>How many guests can this room sleep</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>PRICE MODEL</Text>
          <Controller
            control={control}
            name="priceModel"
            render={({ field: { value, onChange } }) => (
              <View style={styles.priceModelGroup}>
                <Pressable
                  style={[styles.priceModelOption, value === 'FIXED' && styles.priceModelOptionActive]}
                  onPress={() => onChange('FIXED')}>
                  <View style={styles.priceModelLeft}>
                    <View style={[styles.priceModelIconTile, value === 'FIXED' && styles.priceModelIconTileActive]}>
                      <SquareIcon />
                    </View>
                    <View>
                      <Text style={styles.priceModelTitle}>Fixed price</Text>
                      <Text style={styles.priceModelSubtitle}>Same rate no matter how many guests</Text>
                    </View>
                  </View>
                  <View style={[styles.radioOuter, value === 'FIXED' && styles.radioOuterActive]}>
                    {value === 'FIXED' && <View style={styles.radioInner} />}
                  </View>
                </Pressable>
                <Pressable
                  style={[styles.priceModelOption, value === 'FLEXIBLE' && styles.priceModelOptionActive]}
                  onPress={() => onChange('FLEXIBLE')}>
                  <View style={styles.priceModelLeft}>
                    <View style={[styles.priceModelIconTile, value === 'FLEXIBLE' && styles.priceModelIconTileActive]}>
                      <TrendIcon color={value === 'FLEXIBLE' ? colors.navy : colors.textMuted} />
                    </View>
                    <View>
                      <Text style={styles.priceModelTitle}>Price per guest</Text>
                      <Text style={styles.priceModelSubtitle}>Rate increases with each extra guest</Text>
                    </View>
                  </View>
                  <View style={[styles.radioOuter, value === 'FLEXIBLE' && styles.radioOuterActive]}>
                    {value === 'FLEXIBLE' && <View style={styles.radioInner} />}
                  </View>
                </Pressable>
              </View>
            )}
          />
        </View>

        {priceModel === 'FIXED' ? (
          <View style={styles.priceBox}>
            <Text style={styles.fieldLabel}>PRICE PER NIGHT</Text>
            <Controller
              control={control}
              name="price"
              render={({ field: { value, onChange, onBlur } }) => (
                <View style={styles.currencyInput}>
                  <Text style={styles.currencyPrefix}>NGN</Text>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="0.00"
                    placeholderTextColor={colors.textFaint}
                    keyboardType="numeric"
                    style={styles.currencyValue}
                  />
                </View>
              )}
            />
            {errors.price && <Text style={styles.fieldError}>{errors.price.message}</Text>}
          </View>
        ) : (
          <View style={styles.priceBox}>
            <Text style={styles.fieldLabel}>PRICE PER NIGHT, BY GUEST COUNT</Text>
            <View style={styles.flexPriceList}>
              {Array.from({ length: maxNumberOfGuest }, (_, i) => (
                <View key={i} style={styles.flexPriceRow}>
                  <Text style={styles.flexPriceGuestLabel}>
                    {i + 1} guest{i === 0 ? '' : 's'}
                  </Text>
                  <Controller
                    control={control}
                    name={`flexiblePrices.${i}` as const}
                    render={({ field: { value, onChange, onBlur } }) => (
                      <View style={styles.currencyInputSmall}>
                        <Text style={styles.currencyPrefixSmall}>NGN</Text>
                        <TextInput
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="0.00"
                          placeholderTextColor={colors.textFaint}
                          keyboardType="numeric"
                          style={styles.currencyValueSmall}
                        />
                      </View>
                    )}
                  />
                </View>
              ))}
            </View>
            {errors.flexiblePrices && <Text style={styles.fieldError}>Enter a price for every guest count.</Text>}
          </View>
        )}

        {mutation.isError && <Text style={styles.submitErrorText}>{mutation.error.message}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cancelButton} onPress={() => router.back()} disabled={mutation.isPending}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.submitButton} onPress={handleSubmit(onSubmit)} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <CheckIcon />
              <Text style={styles.submitButtonText}>{isEdit ? 'Save changes' : 'Add room type'}</Text>
            </>
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
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    flexShrink: 1,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flexShrink: 1,
  },
  headerTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 17,
    color: colors.navyInk,
  },
  headerSubtitle: {
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
  field: {
    marginTop: 18,
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  fieldError: {
    marginTop: 6,
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.danger,
  },
  submitErrorText: {
    marginTop: 18,
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
    color: colors.danger,
    textAlign: 'center',
  },
  inputPrimary: {
    marginTop: 8,
    height: 46,
    borderWidth: 1.6,
    borderColor: colors.navy,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    marginTop: 8,
    minHeight: 80,
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
  sectionHead: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 15,
    color: colors.navyInk,
  },
  stepperRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 11,
  },
  stepperButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.navyInk,
  },
  stepperValue: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 16,
    color: colors.navyInk,
    width: 24,
    textAlign: 'center',
  },
  stepperHelp: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  priceModelGroup: {
    marginTop: 10,
    gap: 10,
  },
  priceModelOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  priceModelOptionActive: {
    borderWidth: 1.6,
    borderColor: colors.navy,
    backgroundColor: colors.navySoft,
  },
  priceModelLeft: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    flexShrink: 1,
  },
  priceModelIconTile: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  priceModelIconTileActive: {
    backgroundColor: '#FFFFFF',
  },
  priceModelTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  priceModelSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioOuterActive: {
    borderColor: colors.navy,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.navy,
  },
  priceBox: {
    marginTop: 16,
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: 14,
  },
  currencyInput: {
    marginTop: 8,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyPrefix: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  currencyValue: {
    flex: 1,
    height: '100%',
    paddingLeft: 8,
    fontFamily: fonts.headingBold,
    fontSize: 15,
    color: colors.navyInk,
  },
  flexPriceList: {
    marginTop: 10,
    gap: 8,
  },
  flexPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flexPriceGuestLabel: {
    width: 64,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.text,
  },
  currencyInputSmall: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyPrefixSmall: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  currencyValueSmall: {
    flex: 1,
    height: '100%',
    paddingLeft: 6,
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.navyInk,
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
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    ...shadow.button,
  },
  submitButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
