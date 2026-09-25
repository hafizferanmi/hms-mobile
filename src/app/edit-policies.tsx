import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { z } from 'zod';

import { updateCompanyPolicies } from '@/api/company';
import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { colors, fonts, radii, shadow } from '@/design/theme';
import { useCompany } from '@/hooks/use-company';

// -----------------------------------------------------------------------
// EditPolicies.html. Gated on useCompany() (same reasoning as
// company-settings.tsx) so useForm()'s defaultValues start from the real
// company doc.
//
// checkInTime/checkOutTime/childFreeAge/smokingAllowed/petsAllowed are
// plain useState, not react-hook-form fields — none of them is free text:
// the times are a stepper (always has a value, nothing to validate), the
// child policy is a single-select picker, and the two toggles are
// booleans. Only additionalRules/termsAndConditions go through
// react-hook-form + zod, matching hms-backend-node's own
// CompanyPoliciesSchema (additionalRules capped at 2000 chars).
// -----------------------------------------------------------------------

const policiesSchema = z.object({
  additionalRules: z.string().max(2000, { error: 'Keep this under 2000 characters' }).optional(),
  termsAndConditions: z.string().optional(),
});
type PoliciesFormValues = z.infer<typeof policiesSchema>;

const CHILD_POLICY_OPTIONS = [null, ...Array.from({ length: 17 }, (_, i) => i + 1)];

function formatTime12h(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}
function stepTime(hhmm: string, direction: -1 | 1, stepMinutes = 30) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = (((h * 60 + m + direction * stepMinutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
function formatChildPolicy(age: number | null) {
  return age ? `Free under ${age}` : 'No free admission';
}

function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function ClockIcon({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 3" />
    </Svg>
  );
}
function ChevronLeftIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function ChevronRightIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}
function ChevronDownIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}
function ClockSectionIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 3" />
    </Svg>
  );
}
function ShieldSectionIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6z" />
    </Svg>
  );
}
function DocSectionIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <Path d="M9 12h6M9 16h6" />
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

function TimeStepperField({
  label,
  value,
  onStep,
}: {
  label: string;
  value: string;
  onStep: (direction: -1 | 1) => void;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.timeStepperRow}>
        <Pressable hitSlop={8} onPress={() => onStep(-1)}>
          <ChevronLeftIcon />
        </Pressable>
        <View style={styles.timeStepperValueWrap}>
          <ClockIcon color={colors.navy} />
          <Text style={styles.timeStepperValueText}>{formatTime12h(value)}</Text>
        </View>
        <Pressable hitSlop={8} onPress={() => onStep(1)}>
          <ChevronRightIcon />
        </Pressable>
      </View>
    </View>
  );
}

function AllowedToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.toggleRow}>
        <Pressable style={[styles.toggleButton, value && styles.toggleButtonActive]} onPress={() => onChange(true)}>
          <Text style={[styles.toggleButtonText, value && styles.toggleButtonTextActive]}>Allowed</Text>
        </Pressable>
        <Pressable style={[styles.toggleButton, !value && styles.toggleButtonActive]} onPress={() => onChange(false)}>
          <Text style={[styles.toggleButtonText, !value && styles.toggleButtonTextActive]}>Not allowed</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function EditPoliciesScreen() {
  const { data: company, isLoading } = useCompany();

  if (isLoading || !company) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  return <EditPoliciesForm company={company} />;
}

function EditPoliciesForm({ company }: { company: NonNullable<ReturnType<typeof useCompany>['data']> }) {
  const queryClient = useQueryClient();
  const [checkInTime, setCheckInTime] = useState(company.checkInTime || '14:00');
  const [checkOutTime, setCheckOutTime] = useState(company.checkOutTime || '12:00');
  const [childFreeAge, setChildFreeAge] = useState<number | null>(company.childFreeAge ?? null);
  const [childPickerOpen, setChildPickerOpen] = useState(false);
  const [smokingAllowed, setSmokingAllowed] = useState(company.smokingAllowed ?? false);
  const [petsAllowed, setPetsAllowed] = useState(company.petsAllowed ?? false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PoliciesFormValues>({
    resolver: zodResolver(policiesSchema),
    defaultValues: {
      additionalRules: company.additionalRules ?? '',
      termsAndConditions: company.termsAndConditions ?? '',
    },
  });
  const additionalRulesLength = (useWatch({ control, name: 'additionalRules' }) ?? '').length;

  const saveMutation = useMutation({
    mutationFn: updateCompanyPolicies,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      router.back();
    },
  });

  function onSubmit(values: PoliciesFormValues) {
    saveMutation.mutate({
      checkInTime,
      checkOutTime,
      childFreeAge,
      smokingAllowed,
      petsAllowed,
      additionalRules: values.additionalRules || undefined,
      termsAndConditions: values.termsAndConditions || undefined,
    });
  }

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Edit policies</Text>
          <Text style={styles.headerSubtitle}>Shown to your front desk team</Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <CloseIcon />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <SectionHeader icon={<ClockSectionIcon />} title="Stay policy" />
        <View style={styles.sectionCard}>
          <View style={styles.rowFields}>
            <View style={styles.rowField}>
              <TimeStepperField label="CHECK-IN TIME" value={checkInTime} onStep={(d) => setCheckInTime((t) => stepTime(t, d))} />
            </View>
            <View style={styles.rowField}>
              <TimeStepperField label="CHECK-OUT TIME" value={checkOutTime} onStep={(d) => setCheckOutTime((t) => stepTime(t, d))} />
            </View>
          </View>

          <View>
            <Text style={styles.fieldLabel}>CHILD POLICY</Text>
            <Pressable style={styles.pickerRow} onPress={() => setChildPickerOpen((v) => !v)}>
              <Text style={styles.pickerValue}>{formatChildPolicy(childFreeAge)}</Text>
              <ChevronDownIcon />
            </Pressable>
            {childPickerOpen && (
              <View style={styles.pickerPanel}>
                <ScrollView style={styles.pickerOptionsScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  {CHILD_POLICY_OPTIONS.map((age) => (
                    <Pressable
                      key={age ?? 'none'}
                      style={styles.pickerOption}
                      onPress={() => {
                        setChildFreeAge(age);
                        setChildPickerOpen(false);
                      }}>
                      <Text style={styles.pickerOptionText}>{formatChildPolicy(age)}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sectionHeaderSpaced}>
          <SectionHeader icon={<ShieldSectionIcon />} title="House rules" />
        </View>
        <View style={styles.sectionCard}>
          <AllowedToggle label="SMOKING POLICY" value={smokingAllowed} onChange={setSmokingAllowed} />
          <AllowedToggle label="PET POLICY" value={petsAllowed} onChange={setPetsAllowed} />

          <View>
            <View style={styles.charCountRow}>
              <Text style={styles.fieldLabel}>ADDITIONAL RULES</Text>
              <Text style={styles.charCountText}>{additionalRulesLength}/2000</Text>
            </View>
            <Controller
              control={control}
              name="additionalRules"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g. No parties or events"
                  placeholderTextColor={colors.textFaint}
                  multiline
                  style={[styles.textArea, styles.textAreaShort]}
                />
              )}
            />
            {errors.additionalRules && <Text style={styles.fieldError}>{errors.additionalRules.message}</Text>}
          </View>
        </View>

        <View style={styles.sectionHeaderSpaced}>
          <SectionHeader icon={<DocSectionIcon />} title="Terms and conditions" />
        </View>
        <View style={styles.sectionCard}>
          <Text style={styles.hintText}>Stored for your records — not yet shown to guests anywhere in the app.</Text>
          <Controller
            control={control}
            name="termsAndConditions"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Your terms and conditions"
                placeholderTextColor={colors.textFaint}
                multiline
                style={[styles.textArea, styles.textAreaLong]}
              />
            )}
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
  sectionCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 16,
    gap: 14,
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
  timeStepperRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeStepperValueWrap: {
    flex: 1,
    height: 44,
    borderWidth: 1.6,
    borderColor: colors.navy,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  timeStepperValueText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.navyInk,
  },
  pickerRow: {
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
  pickerValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: colors.navyInk,
  },
  pickerPanel: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  pickerOptionsScroll: {
    maxHeight: 180,
  },
  pickerOption: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerOptionText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  toggleButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  toggleButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  charCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  charCountText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textFaint,
  },
  textArea: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
    textAlignVertical: 'top',
  },
  textAreaShort: {
    height: 70,
  },
  textAreaLong: {
    height: 110,
  },
  hintText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textFaint,
    lineHeight: 16,
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
