import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, type Control, type FieldValues, type Path } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { z } from 'zod';

import { switchMyCompany } from '@/api/account';
import { addOrganizationCompany, getOrganizationCompanies, ESTIMATED_ROOMS_OPTIONS } from '@/api/organization';
import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { SearchablePicker } from '@/components/searchable-picker';
import { COUNTRY_OPTIONS } from '@/constants/countries';
import { colors, fonts, radii } from '@/design/theme';
import { useSession } from '@/hooks/use-session';

// NewCompany.html — its own route rather than a view nested inside
// switch-property-sheet.tsx (which it started as), since it has real text
// inputs that deserve full-screen keyboard handling (KeyboardSafeView)
// instead of the sheet's cramped, keyboard-avoiding overlay. Pushed from
// that sheet's "New company" row; "Cancel"/the close X just go back to it.
//
// On success, this doesn't just go back — it switches the session straight
// into the new company and replaces the whole screen with Home, same as
// picking an existing company from the sheet does (see afterSwitch in
// switch-property-sheet.tsx): there's no page-reload equivalent on mobile,
// so the query cache is cleared instead, and Home is exactly what the web
// app's post-switch reload would have landed the user back on anyway.

const newCompanySchema = z.object({
  name: z.string().min(1, { error: 'Company name is required' }),
  city: z.string().optional(),
});
type NewCompanyFormValues = z.infer<typeof newCompanySchema>;

function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <SvgPath d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function PlusIcon({ color = colors.navy, size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <SvgPath d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function InfoIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2}>
      <SvgPath d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8v5" strokeLinecap="round" />
      <SvgPath d="M12 16h.01" strokeLinecap="round" />
    </Svg>
  );
}

function ControlledField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  error,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            value={(value as string) ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />
        )}
      />
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

export default function NewCompanyScreen() {
  const { session, signIn } = useSession();
  const queryClient = useQueryClient();
  const [country, setCountry] = useState('');
  const [estimatedRooms, setEstimatedRooms] = useState(ESTIMATED_ROOMS_OPTIONS[0]);

  // Only used for the org-name line in the info banner — the sheet this
  // screen was pushed from already fetched the same query, so this is
  // effectively free (React Query serves it from cache).
  const { data } = useQuery({ queryKey: ['organization-companies'], queryFn: getOrganizationCompanies });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<NewCompanyFormValues>({
    resolver: zodResolver(newCompanySchema),
    defaultValues: { name: '', city: '' },
  });

  const createMutation = useMutation({
    mutationFn: async (values: NewCompanyFormValues) => {
      const created = await addOrganizationCompany({
        company: values.name.trim(),
        country: country || undefined,
        city: values.city?.trim() || undefined,
        estimatedRooms,
      });
      return switchMyCompany(created._id);
    },
    onSuccess: (updatedStaff) => {
      if (session) signIn(session.token, updatedStaff);
      queryClient.clear();
      router.replace('/');
    },
  });

  const countryOptions = COUNTRY_OPTIONS.map((c) => ({ value: c.code, label: c.name }));
  const roomsOptions = ESTIMATED_ROOMS_OPTIONS.map((o) => ({ value: o, label: o.replace('-', '–') }));
  const orgLabel = data?.organizationName ?? 'your organization';

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconTile}>
            <PlusIcon />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>New company</Text>
            <Text style={styles.headerSubtitle}>Add another property to your organization</Text>
          </View>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <CloseIcon />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.orgNote}>
          <InfoIcon />
          <Text style={styles.orgNoteText}>
            This company will be added under <Text style={styles.orgNoteBold}>{orgLabel}</Text>.
          </Text>
        </View>

        <View style={styles.field}>
          <ControlledField control={control} name="name" label="COMPANY NAME" placeholder="e.g. Riverside Suites" error={errors.name?.message} />
        </View>

        <View style={styles.rowFields}>
          <View style={styles.rowField}>
            <SearchablePicker
              label="COUNTRY"
              displayValue={COUNTRY_OPTIONS.find((c) => c.code === country)?.name}
              placeholder="Select country"
              options={countryOptions}
              onSelect={setCountry}
            />
          </View>
          <View style={styles.rowField}>
            <ControlledField control={control} name="city" label="CITY" placeholder="e.g. Abuja" error={errors.city?.message} />
          </View>
        </View>

        <View style={styles.field}>
          <SearchablePicker
            label="ESTIMATED ROOMS"
            displayValue={roomsOptions.find((o) => o.value === estimatedRooms)?.label}
            placeholder="Select a range"
            options={roomsOptions}
            onSelect={setEstimatedRooms}
          />
        </View>

        {createMutation.isError && <Text style={styles.submitErrorText}>{createMutation.error.message}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cancelButton} onPress={() => router.back()} disabled={createMutation.isPending}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.createButton, createMutation.isPending && styles.createButtonDisabled]}
          disabled={createMutation.isPending}
          onPress={handleSubmit((values) => createMutation.mutate(values))}>
          {createMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <PlusIcon color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create company</Text>
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
    gap: 12,
    alignItems: 'flex-start',
    flexShrink: 1,
  },
  headerIconTile: {
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
  orgNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.navySoft,
    borderRadius: 12,
    padding: 14,
  },
  orgNoteText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.navy,
    lineHeight: 18,
  },
  orgNoteBold: {
    fontFamily: fonts.bodyBold,
  },
  field: {
    marginTop: 20,
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  fieldError: {
    marginTop: 5,
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.danger,
  },
  input: {
    marginTop: 8,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  rowField: {
    flex: 1,
  },
  submitErrorText: {
    marginTop: 16,
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
    color: colors.danger,
    textAlign: 'center',
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
  createButton: {
    flex: 1.4,
    height: 48,
    borderRadius: radii.input,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
