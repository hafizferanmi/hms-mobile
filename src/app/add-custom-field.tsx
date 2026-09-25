import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { z } from 'zod';

import {
  addCustomField,
  updateCustomField,
  type CustomFieldForm,
  type CustomFieldType,
} from '@/api/custom-fields';
import { CustomFieldTypeIcon } from '@/components/custom-field-type-icon';
import { CUSTOM_FIELD_TYPE_META, CUSTOM_FIELD_TYPE_ORDER, isOptionsType } from '@/constants/custom-field-types';
import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { colors, fonts, radii, shadow } from '@/design/theme';
import { useCustomFields } from '@/hooks/use-custom-fields';

// -----------------------------------------------------------------------
// AddCustomField.html — also doubles as "Edit field" (opened from
// custom-fields.tsx's FieldActionsMenu with ?id=&form=), same reuse
// decision as add-staff.tsx/add-room-type.tsx: identical fields, and
// hms-backend-node's PUT /custom-fields/:id takes the same payload shape
// as POST /custom-fields.
//
// The mockup has no options-editor UI at all, even though its own list
// screen shows a "Single select · 3 options" example — there's nowhere
// else in it to enter those 3 option strings. This adds a minimal
// add/remove chip list, shown only once Single/Multi select is chosen,
// since SINGLE_SELECT/MULTI_SELECT genuinely can't be saved without at
// least one option (hms-backend-node accepts an empty array, but a select
// field with zero choices isn't answerable) — flagged here as inferred,
// not from the design.
// -----------------------------------------------------------------------

const fieldFormSchema = z.object({
  label: z.string().min(1, { error: 'Field label is required' }),
  helper: z.string().optional(),
});
type FieldFormValues = z.infer<typeof fieldFormSchema>;

function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function PlusIcon({ color = colors.navy }: { color?: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function SmallCloseIcon() {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function SaveIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <Pressable
      style={[styles.toggleTrack, value && styles.toggleTrackActive]}
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}>
      <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
    </Pressable>
  );
}

export default function AddCustomFieldScreen() {
  const { id, form } = useLocalSearchParams<{ id?: string; form: CustomFieldForm }>();
  const { data: fields, isLoading } = useCustomFields(form);
  const isEditMode = !!id;
  const field = id ? fields?.find((f) => f._id === id) : undefined;

  if (isEditMode && isLoading) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }
  if (isEditMode && !field) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Field not found.</Text>
      </View>
    );
  }

  return <AddCustomFieldForm form={form} field={field} />;
}

function AddCustomFieldForm({
  form,
  field,
}: {
  form: CustomFieldForm;
  field: ReturnType<typeof useCustomFields>['data'] extends (infer U)[] | undefined ? U | undefined : never;
}) {
  const queryClient = useQueryClient();
  const isEditMode = !!field;
  const [type, setType] = useState<CustomFieldType>(field?.type ?? 'SHORT_TEXT');
  const [required, setRequired] = useState(field?.required ?? false);
  const [options, setOptions] = useState<string[]>(field?.options ?? []);
  const [optionDraft, setOptionDraft] = useState('');
  const [optionsError, setOptionsError] = useState<string | undefined>();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldFormValues>({
    resolver: zodResolver(fieldFormSchema),
    defaultValues: {
      label: field?.label ?? '',
      helper: field?.helper ?? '',
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload: { label: string; helper?: string }) =>
      isEditMode
        ? updateCustomField(field._id, { form, type, options, required, ...payload })
        : addCustomField({ form, type, options, required, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', form] });
      router.back();
    },
  });

  function addOption() {
    const value = optionDraft.trim();
    if (!value) return;
    if (options.includes(value)) {
      setOptionDraft('');
      return;
    }
    setOptions((prev) => [...prev, value]);
    setOptionDraft('');
    setOptionsError(undefined);
  }
  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function onSubmit(values: FieldFormValues) {
    if (isOptionsType(type) && options.length === 0) {
      setOptionsError('Add at least one option');
      return;
    }
    setOptionsError(undefined);
    saveMutation.mutate({ label: values.label, helper: values.helper || undefined });
  }

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isEditMode ? 'Edit field' : `Add field to ${form === 'REVIEW' ? 'review' : 'reservation'} form`}
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <CloseIcon />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.fieldLabel}>FIELD LABEL</Text>
        <Controller
          control={control}
          name="label"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="e.g. Special occasion"
              placeholderTextColor={colors.textFaint}
              style={styles.labelInput}
            />
          )}
        />
        {errors.label && <Text style={styles.fieldError}>{errors.label.message}</Text>}

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>FIELD TYPE</Text>
          <View style={styles.typeGrid}>
            {CUSTOM_FIELD_TYPE_ORDER.map((t) => {
              const meta = CUSTOM_FIELD_TYPE_META[t];
              const active = type === t;
              return (
                <Pressable
                  key={t}
                  style={[styles.typeCard, active && styles.typeCardActive]}
                  onPress={() => {
                    setType(t);
                    setOptionsError(undefined);
                  }}>
                  <View style={[styles.typeIconTile, { backgroundColor: active ? meta.color : meta.bg }]}>
                    <CustomFieldTypeIcon type={t} color={active ? '#FFFFFF' : meta.color} size={14} />
                  </View>
                  <Text style={[styles.typeCardText, active && styles.typeCardTextActive]}>{meta.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {isOptionsType(type) && (
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>OPTIONS</Text>
            {options.length > 0 && (
              <View style={styles.optionChipRow}>
                {options.map((opt, i) => (
                  <View key={`${opt}-${i}`} style={styles.optionChip}>
                    <Text style={styles.optionChipText}>{opt}</Text>
                    <Pressable onPress={() => removeOption(i)} hitSlop={6}>
                      <SmallCloseIcon />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.optionInputRow}>
              <TextInput
                value={optionDraft}
                onChangeText={setOptionDraft}
                placeholder="Type an option, then tap +"
                placeholderTextColor={colors.textFaint}
                style={styles.optionInput}
                onSubmitEditing={addOption}
                returnKeyType="done"
              />
              <Pressable style={styles.optionAddButton} onPress={addOption} disabled={!optionDraft.trim()}>
                <PlusIcon color="#FFFFFF" />
              </Pressable>
            </View>
            {optionsError && <Text style={styles.fieldError}>{optionsError}</Text>}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.fieldLabel}>
            PLACEHOLDER / HELPER TEXT <Text style={styles.fieldLabelOptional}>optional</Text>
          </Text>
          <Controller
            control={control}
            name="helper"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Shown as a hint under the field"
                placeholderTextColor={colors.textFaint}
                style={styles.helperInput}
              />
            )}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.requiredRow}>
          <View style={styles.requiredText}>
            <Text style={styles.requiredTitle}>Required</Text>
            <Text style={styles.requiredHint}>Can&apos;t be left blank when submitting the form</Text>
          </View>
          <Toggle value={required} onChange={setRequired} />
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
            <>
              <SaveIcon />
              <Text style={styles.saveButtonText}>Save field</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.headingExtraBold,
    fontSize: 17,
    color: colors.navyInk,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  section: {
    marginTop: 20,
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  fieldLabelOptional: {
    fontFamily: fonts.bodyMedium,
    textTransform: 'none',
    letterSpacing: 0,
    color: colors.textFaint,
  },
  fieldError: {
    marginTop: 5,
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.danger,
  },
  labelInput: {
    marginTop: 8,
    height: 46,
    borderWidth: 1.6,
    borderColor: colors.navy,
    borderRadius: 11,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  helperInput: {
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  typeCard: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.4,
    borderColor: colors.border,
  },
  typeCardActive: {
    borderWidth: 1.6,
    borderColor: colors.navy,
    backgroundColor: colors.navySoft,
  },
  typeIconTile: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeCardText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.navyInk,
    flexShrink: 1,
  },
  typeCardTextActive: {
    color: colors.navy,
  },
  optionChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.navySoft,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  optionChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.navy,
  },
  optionInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  optionInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.text,
  },
  optionAddButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 22,
  },
  requiredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 18,
  },
  requiredText: {
    flex: 1,
  },
  requiredTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  requiredHint: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textFaint,
    marginTop: 3,
  },
  toggleTrack: {
    width: 38,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleTrackActive: {
    backgroundColor: colors.navy,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    marginLeft: 16,
  },
  submitErrorText: {
    marginTop: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
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
