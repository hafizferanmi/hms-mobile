import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm, type Control, type FieldValues, type Path } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path as SvgPath, Rect } from 'react-native-svg';
import { z } from 'zod';

import { updateCompanySettings } from '@/api/company';
import { COUNTRY_OPTIONS, CURRENCY_OPTIONS, countryName } from '@/constants/countries';
import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { SearchablePicker } from '@/components/searchable-picker';
import { colors, fonts, radii, shadow } from '@/design/theme';
import { useCompany } from '@/hooks/use-company';

// -----------------------------------------------------------------------
// CompanySettingsEdit.html. Gated on useCompany() being loaded (same
// reasoning as edit-guest.tsx's outer/inner split) so useForm()'s
// defaultValues can use the real company doc from the first render,
// no reset()-on-load juggling needed.
//
// Country/currency are plain useState + a searchable inline picker, not
// react-hook-form fields — same split as edit-guest.tsx's room picker:
// their "validation" is really just requiring one be chosen (country is
// required server-side; currency isn't), enforced with a manual check
// rather than a zod string field. Both option lists come from
// src/constants/countries.ts (the same `countries-list` package
// hms-backend-node itself validates `country`/`currency` against), so
// nothing this picker can select is a value the backend would reject.
//
// idNumber/taxNumber/slogan exist on CompanySettingsSchema/the Company
// model but have no field in this mockup — omitting them from the PUT
// payload would risk Mongoose overwriting them, so whatever the company
// already has for those is round-tripped back unchanged (see onSubmit).
// -----------------------------------------------------------------------

const companySettingsSchema = z.object({
  name: z.string().min(1, { error: 'Company name is required' }),
  address: z.string().optional(),
  taxRate: z
    .string()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100), {
      error: 'Enter a tax rate between 0 and 100',
    }),
  taxLabel: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine((v) => !v || z.email().safeParse(v).success, { error: 'Enter a valid email address' }),
  phone: z.string().optional(),
  website: z.string().optional(),
});
type CompanySettingsFormValues = z.infer<typeof companySettingsSchema>;

function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <SvgPath d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function UploadIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <SvgPath d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function BuildingSectionIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <SvgPath d="M3 21h18M6 21V7l6-4 6 4v14M9 21v-6h6v6" />
    </Svg>
  );
}
function ImageSectionIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={3} width={18} height={18} rx={2} />
      <Circle cx={8.5} cy={8.5} r={1.5} />
      <SvgPath d="m21 15-5-5L5 21" />
    </Svg>
  );
}
function GlobeSectionIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <SvgPath d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </Svg>
  );
}
function PhoneSectionIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <SvgPath d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 3a2 2 0 0 1-.5 2.1L8 10.1a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 2 .5 3 .7a2 2 0 0 1 1.6 2z" />
    </Svg>
  );
}
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={styles.sectionHeaderIcon}>{icon}</View>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
    </View>
  );
}

function ControlledField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  keyboardType,
  error,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'decimal-pad' | 'url';
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
            keyboardType={keyboardType === 'url' ? 'default' : keyboardType}
            autoCapitalize={keyboardType === 'email-address' || keyboardType === 'url' ? 'none' : 'sentences'}
            style={styles.input}
          />
        )}
      />
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

export default function CompanySettingsScreen() {
  const { data: company, isLoading } = useCompany();

  if (isLoading || !company) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  return <CompanySettingsForm company={company} />;
}

function CompanySettingsForm({ company }: { company: NonNullable<ReturnType<typeof useCompany>['data']> }) {
  const queryClient = useQueryClient();
  const [country, setCountry] = useState(company.country ?? '');
  const [currency, setCurrency] = useState(company.currency ?? '');
  const [countryError, setCountryError] = useState<string | undefined>();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanySettingsFormValues>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      name: company.name,
      address: company.address ?? '',
      taxRate: company.taxRate !== undefined ? String(company.taxRate) : '',
      taxLabel: company.taxLabel ?? '',
      email: company.email ?? '',
      phone: company.phone ?? '',
      website: company.website ?? '',
    },
  });

  const saveMutation = useMutation({
    mutationFn: updateCompanySettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      router.back();
    },
  });

  function onSubmit(values: CompanySettingsFormValues) {
    if (!country) {
      setCountryError('Country is required');
      return;
    }
    setCountryError(undefined);
    saveMutation.mutate({
      name: values.name,
      address: values.address || undefined,
      country,
      currency: currency || undefined,
      taxRate: values.taxRate ? Number(values.taxRate) : undefined,
      taxLabel: values.taxLabel || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      website: values.website || undefined,
      // Not editable from this form — round-tripped so saving here can't
      // silently wipe them out. See file header comment.
      idNumber: company.idNumber,
      taxNumber: company.taxNumber,
      slogan: company.slogan,
    });
  }

  const countryOptions = useMemo(() => COUNTRY_OPTIONS.map((c) => ({ value: c.code, label: c.name })), []);
  const currencyOptions = useMemo(() => CURRENCY_OPTIONS.map((c) => ({ value: c, label: c })), []);

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Company settings</Text>
          <Text style={styles.headerSubtitle}>Shown on invoices, guest emails &amp; bookings</Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <CloseIcon />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <SectionHeader icon={<ImageSectionIcon />} title="Branding" />
        {/* TODO(upload): no image-picker/upload flow exists anywhere in
            this app yet — inert until that's built, matching how other
            not-yet-designed actions in this app stay inert rather than
            half-wired. */}
        <Pressable style={styles.uploadCard}>
          <View style={styles.uploadIconTile}>
            <UploadIcon />
          </View>
          <View style={styles.uploadText}>
            <Text style={styles.uploadTitle}>Upload logo</Text>
            <Text style={styles.uploadHint}>PNG or SVG, at least 256×256px</Text>
          </View>
        </Pressable>

        <View style={styles.sectionHeaderSpaced}>
          <SectionHeader icon={<BuildingSectionIcon />} title="Company details" />
        </View>
        <View style={styles.sectionCard}>
          <ControlledField control={control} name="name" label="COMPANY NAME" error={errors.name?.message} />
          <ControlledField control={control} name="address" label="COMPANY ADDRESS" error={errors.address?.message} />
        </View>

        <View style={styles.sectionHeaderSpaced}>
          <SectionHeader icon={<GlobeSectionIcon />} title="Regional" />
        </View>
        <View style={styles.sectionCard}>
          <View style={styles.rowFields}>
            <View style={styles.rowField}>
              <SearchablePicker
                label="COUNTRY"
                displayValue={countryName(country)}
                placeholder="Select country"
                options={countryOptions}
                onSelect={(v) => {
                  setCountry(v);
                  setCountryError(undefined);
                }}
                error={countryError}
              />
            </View>
            <View style={styles.rowField}>
              <SearchablePicker
                label="CURRENCY"
                displayValue={currency}
                placeholder="Select currency"
                options={currencyOptions}
                onSelect={setCurrency}
              />
            </View>
          </View>
          <View style={styles.rowFields}>
            <View style={styles.rowField}>
              <ControlledField
                control={control}
                name="taxRate"
                label="TAX RATE (%)"
                keyboardType="decimal-pad"
                error={errors.taxRate?.message}
              />
            </View>
            <View style={styles.rowField}>
              <ControlledField control={control} name="taxLabel" label="TAX LABEL" error={errors.taxLabel?.message} />
            </View>
          </View>
        </View>

        <View style={styles.sectionHeaderSpaced}>
          <SectionHeader icon={<PhoneSectionIcon />} title="Contact" />
        </View>
        <View style={styles.sectionCard}>
          <ControlledField
            control={control}
            name="email"
            label="COMPANY EMAIL"
            keyboardType="email-address"
            error={errors.email?.message}
          />
          <ControlledField
            control={control}
            name="phone"
            label="COMPANY PHONE NO."
            keyboardType="phone-pad"
            error={errors.phone?.message}
          />
          <ControlledField
            control={control}
            name="website"
            label="COMPANY WEBSITE"
            keyboardType="url"
            error={errors.website?.message}
          />
        </View>

        {saveMutation.isError && <Text style={styles.submitErrorText}>{saveMutation.error.message}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cancelButton} onPress={() => router.back()} disabled={saveMutation.isPending}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
          disabled={saveMutation.isPending}
          onPress={handleSubmit(onSubmit)}>
          {saveMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save changes</Text>
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
  headerText: {
    flexShrink: 1,
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
    marginTop: 3,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionHeaderSpaced: {
    marginTop: 24,
  },
  sectionHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 15,
    color: colors.navyInk,
  },
  uploadCard: {
    marginTop: 12,
    borderWidth: 1.4,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.bg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadIconTile: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.4,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    marginLeft: 14,
    flexShrink: 1,
  },
  uploadTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.navyInk,
  },
  uploadHint: {
    fontFamily: fonts.body,
    fontSize: 10.5,
    color: colors.textFaint,
    marginTop: 2,
  },
  sectionCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 16,
    gap: 12,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
  },
  rowField: {
    flex: 1,
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
    marginTop: 6,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
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
  saveButton: {
    flex: 1.4,
    height: 48,
    borderRadius: radii.input,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.button,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
