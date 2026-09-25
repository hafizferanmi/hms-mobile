import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch, type Control, type FieldErrors } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { z } from 'zod';

import { addGuest } from '@/api/reservations';
import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { colors, fonts, radii, shadow } from '@/design/theme';
import { useInvalidateReservationActivity } from '@/hooks/use-reservation-activity';
import { useReservations } from '@/hooks/use-reservations';

// -----------------------------------------------------------------------
// AddVisitors.html, opened from the Reservation Detail hub's "Add"/
// "Add visitor" link next to Additional Guests. Per design/design-
// reference/reservations.md: "Add visitor → back to ReservationDetail
// .html, visitor added." Now talks to the real POST /check-ins/:id/guests
// (see addGuest in src/api/reservations.ts), through react-hook-form +
// zod with useFieldArray for the repeatable visitor cards — matching
// hms-backend-node's own guest-schema.js (firstName required per visitor,
// everything else optional).
// -----------------------------------------------------------------------

const TITLES = ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr'];

const visitorSchema = z.object({
  title: z.string().optional(),
  firstName: z.string().min(1, { error: 'First name is required' }),
  lastName: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine((v) => !v || z.email().safeParse(v).success, { error: 'Enter a valid email address' }),
  phone: z.string().optional(),
});
const visitorsFormSchema = z.object({
  visitors: z.array(visitorSchema).min(1),
});
type VisitorsFormValues = z.infer<typeof visitorsFormSchema>;

function makeEmptyVisitor() {
  return { title: '', firstName: '', lastName: '', email: '', phone: '' };
}

function PeopleIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx={9} cy={7} r={4} />
      <Path d="M19 8v6M22 11h-6" />
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
function ChevronDownIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}
function PlusIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function CheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function VisitorCard({
  control,
  index,
  errors,
}: {
  control: Control<VisitorsFormValues>;
  index: number;
  errors: FieldErrors<VisitorsFormValues['visitors'][number]> | undefined;
}) {
  const [titlePickerOpen, setTitlePickerOpen] = useState(false);
  const firstName = useWatch({ control, name: `visitors.${index}.firstName` });
  const lastName = useWatch({ control, name: `visitors.${index}.lastName` });
  const title = useWatch({ control, name: `visitors.${index}.title` });

  return (
    <View style={styles.visitorCard}>
      <View style={styles.visitorCardHeader}>
        <View style={styles.visitorAvatar}>
          <Text style={styles.visitorAvatarText}>
            {firstName || lastName ? getInitials(`${firstName} ${lastName ?? ''}`) : '?'}
          </Text>
        </View>
        <Text style={styles.visitorCardTitle}>Visitor {index + 1}</Text>
      </View>

      <View style={styles.visitorFields}>
        <View>
          <Text style={styles.fieldLabel}>TITLE</Text>
          <Pressable style={styles.titlePicker} onPress={() => setTitlePickerOpen((v) => !v)}>
            <Text style={title ? styles.titleValue : styles.titlePlaceholder}>{title || 'Title'}</Text>
            <ChevronDownIcon />
          </Pressable>
          {titlePickerOpen && (
            <Controller
              control={control}
              name={`visitors.${index}.title`}
              render={({ field: { onChange } }) => (
                <View style={styles.titleOptions}>
                  {TITLES.map((t) => (
                    <Pressable
                      key={t}
                      style={styles.titleOption}
                      onPress={() => {
                        onChange(t);
                        setTitlePickerOpen(false);
                      }}>
                      <Text style={styles.titleOptionText}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            />
          )}
        </View>

        <View>
          <Text style={styles.fieldLabel}>FIRST NAME</Text>
          <Controller
            control={control}
            name={`visitors.${index}.firstName`}
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="First name"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
              />
            )}
          />
          {errors?.firstName && <Text style={styles.fieldError}>{errors.firstName.message}</Text>}
        </View>
        <View>
          <Text style={styles.fieldLabel}>LAST NAME</Text>
          <Controller
            control={control}
            name={`visitors.${index}.lastName`}
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Last name"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
              />
            )}
          />
        </View>
        <View>
          <Text style={styles.fieldLabel}>GUEST EMAIL</Text>
          <Controller
            control={control}
            name={`visitors.${index}.email`}
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Guest email"
                placeholderTextColor={colors.textFaint}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            )}
          />
          {errors?.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}
        </View>
        <View>
          <Text style={styles.fieldLabel}>GUEST PHONE NO.</Text>
          <Controller
            control={control}
            name={`visitors.${index}.phone`}
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Guest phone no."
                placeholderTextColor={colors.textFaint}
                keyboardType="phone-pad"
                style={styles.input}
              />
            )}
          />
        </View>
      </View>
    </View>
  );
}

export default function AddVisitorsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: reservations, isLoading } = useReservations();
  const reservation = reservations?.find((r) => r.id === id);
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateReservationActivity();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VisitorsFormValues>({
    resolver: zodResolver(visitorsFormSchema),
    defaultValues: { visitors: [makeEmptyVisitor()] },
  });
  const { fields, append } = useFieldArray({ control, name: 'visitors' });

  const addVisitorsMutation = useMutation({
    mutationFn: (values: VisitorsFormValues) =>
      addGuest(
        id,
        values.visitors.map((v) => ({
          title: v.title || undefined,
          firstName: v.firstName,
          lastName: v.lastName || undefined,
          email: v.email || undefined,
          phone: v.phone || undefined,
        })),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
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

  function onSubmit(values: VisitorsFormValues) {
    addVisitorsMutation.mutate(values);
  }

  const count = fields.length;

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <PeopleIcon />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Add visitor(s)</Text>
            <Text style={styles.headerSubtitle}>Add extra guests staying alongside the primary guest</Text>
          </View>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <CloseIcon />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.contextPill}>
          <View style={styles.contextAvatar}>
            <Text style={styles.contextAvatarText}>{getInitials(reservation.guestName)}</Text>
          </View>
          <Text style={styles.contextText}>
            Adding to {reservation.guestName}&apos;s stay · Room {reservation.room}
          </Text>
        </View>

        {fields.map((field, i) => (
          <VisitorCard key={field.id} control={control} index={i} errors={errors.visitors?.[i]} />
        ))}

        <Pressable style={styles.addAnotherButton} onPress={() => append(makeEmptyVisitor())}>
          <PlusIcon />
          <Text style={styles.addAnotherText}>Add another visitor</Text>
        </Pressable>

        {addVisitorsMutation.isError && (
          <Text style={styles.submitErrorText}>{addVisitorsMutation.error.message}</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerCount}>
          {count} visitor{count === 1 ? '' : 's'}
        </Text>
        <View style={styles.footerButtons}>
          <Pressable
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={addVisitorsMutation.isPending}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={styles.addButton}
            onPress={handleSubmit(onSubmit)}
            disabled={addVisitorsMutation.isPending}>
            {addVisitorsMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <CheckIcon />
                <Text style={styles.addButtonText}>Add visitor{count === 1 ? '' : 's'}</Text>
              </>
            )}
          </Pressable>
        </View>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
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
  contextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.navySoft,
    borderRadius: 999,
    paddingVertical: 7,
    paddingRight: 14,
    paddingLeft: 7,
    alignSelf: 'flex-start',
  },
  contextAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextAvatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: '#FFFFFF',
  },
  contextText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.navy,
  },
  visitorCard: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 16,
  },
  visitorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  visitorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitorAvatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textFaint,
  },
  visitorCardTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  visitorFields: {
    marginTop: 16,
    gap: 12,
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
    marginTop: 16,
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
    color: colors.danger,
    textAlign: 'center',
  },
  titlePicker: {
    marginTop: 6,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titlePlaceholder: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textFaint,
  },
  titleValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.text,
  },
  titleOptions: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  titleOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleOptionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  input: {
    marginTop: 6,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  addAnotherButton: {
    marginTop: 14,
    height: 50,
    borderWidth: 1.4,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addAnotherText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.navy,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerCount: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
    marginBottom: 10,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 10,
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
  addButton: {
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
  addButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
