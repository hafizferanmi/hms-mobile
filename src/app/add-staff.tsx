import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { z } from 'zod';

import { addStaff, humanizeStaffRole, STAFF_ROLES, updateStaff, type StaffRole } from '@/api/staff';
import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { colors, fonts, radii, shadow } from '@/design/theme';
import { useRoles } from '@/hooks/use-roles';
import { useStaff } from '@/hooks/use-staff';

// -----------------------------------------------------------------------
// AddStaff.html — invite a new team member. Also doubles as the "Edit
// staff" screen (opened from staff-roles.tsx's StaffActionsMenu with
// ?id=<staffId>) since the fields and validation are identical and the
// backend's PUT /staffs/:id takes the same payload shape as POST /staffs
// — same reuse decision as add-room-type.tsx's edit mode.
//
// The mockup's "DEPARTMENT" field maps to the required `role` (STAFF_ROLES
// enum) field — the backend has no separate department concept. "ROLE"
// maps to the optional custom `roleId` (src/api/roles.ts), defaulting to
// "No custom role".
// -----------------------------------------------------------------------

const staffFormSchema = z.object({
  name: z.string().min(1, { error: 'Full name is required' }),
  email: z.email({ error: 'Enter a valid email address' }),
  phone: z.string().min(11, { error: 'Enter a valid phone number' }),
  role: z.string().min(1, { error: 'Choose a department' }),
  roleId: z.string().optional(),
});
type StaffFormValues = z.infer<typeof staffFormSchema>;

function AddPersonIcon() {
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
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function SparkleIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0L19 4m-3.5 3.5L19 11" />
    </Svg>
  );
}

function Picker({
  label,
  value,
  placeholder,
  open,
  onToggle,
  children,
}: {
  label: string;
  value?: string;
  placeholder: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.pickerField} onPress={onToggle}>
        <Text style={value ? styles.pickerValue : styles.pickerPlaceholder}>{value || placeholder}</Text>
        <ChevronDownIcon />
      </Pressable>
      {open && <View style={styles.pickerOptions}>{children}</View>}
    </View>
  );
}

export default function AddStaffScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const queryClient = useQueryClient();
  const { data: staffList } = useStaff();
  const { data: roles } = useRoles();
  const existing = isEdit ? staffList?.find((s) => s._id === id) : undefined;

  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: { name: '', email: '', phone: '', role: '', roleId: '' },
  });

  // Prefills once the staff list resolves in edit mode — mirrors edit-
  // guest.tsx's "reset once real data arrives" approach rather than trying
  // to compute defaultValues before the query has resolved.
  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        email: existing.email,
        phone: existing.phone,
        role: existing.role,
        roleId: existing.roleId?._id ?? '',
      });
    }
  }, [existing, reset]);

  const department = useWatch({ control, name: 'role' });
  const roleId = useWatch({ control, name: 'roleId' });
  const selectedRole = roles?.find((r) => r._id === roleId);

  const mutation = useMutation({
    mutationFn: (values: StaffFormValues) => {
      const payload = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        role: values.role as StaffRole,
        roleId: values.roleId || null,
      };
      return isEdit ? updateStaff(id, payload) : addStaff(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      router.back();
    },
  });

  function onSubmit(values: StaffFormValues) {
    mutation.mutate(values);
  }

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <AddPersonIcon />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{isEdit ? 'Edit staff' : 'Add staff'}</Text>
            <Text style={styles.headerSubtitle}>
              {isEdit ? 'Update this team member’s details' : 'Invite a new team member and set what they can access'}
            </Text>
          </View>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <CloseIcon />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.introCard}>
          <View style={styles.introAvatar}>
            <Text style={styles.introAvatarText}>?</Text>
          </View>
          <View style={styles.introText}>
            <Text style={styles.introTitle}>{isEdit ? 'Team member' : 'New staff member'}</Text>
            <Text style={styles.introSubtitle}>This is how the name will appear everywhere</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>FULL NAME</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Full name"
                placeholderTextColor={colors.textFaint}
                style={styles.inputPrimary}
              />
            )}
          />
          {errors.name && <Text style={styles.fieldError}>{errors.name.message}</Text>}
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.half]}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Email"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
              )}
            />
            {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}
          </View>
          <View style={[styles.field, styles.half]}>
            <Text style={styles.fieldLabel}>PHONE NO.</Text>
            <Controller
              control={control}
              name="phone"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Phone no."
                  placeholderTextColor={colors.textFaint}
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              )}
            />
            {errors.phone && <Text style={styles.fieldError}>{errors.phone.message}</Text>}
          </View>
        </View>

        <View style={styles.field}>
          <Controller
            control={control}
            name="role"
            render={({ field: { onChange } }) => (
              <Picker
                label="DEPARTMENT"
                value={department ? humanizeStaffRole(department) : undefined}
                placeholder="Choose department"
                open={departmentOpen}
                onToggle={() => setDepartmentOpen((v) => !v)}>
                {STAFF_ROLES.map((r) => (
                  <Pressable
                    key={r}
                    style={styles.pickerOption}
                    onPress={() => {
                      onChange(r);
                      setDepartmentOpen(false);
                    }}>
                    <Text style={styles.pickerOptionText}>{humanizeStaffRole(r)}</Text>
                  </Pressable>
                ))}
              </Picker>
            )}
          />
          {errors.role && <Text style={styles.fieldError}>{errors.role.message}</Text>}
        </View>

        <View style={styles.field}>
          <Controller
            control={control}
            name="roleId"
            render={({ field: { onChange } }) => (
              <Picker
                label="ROLE"
                value={selectedRole?.name ?? 'No custom role'}
                placeholder="No custom role"
                open={roleOpen}
                onToggle={() => setRoleOpen((v) => !v)}>
                <Pressable
                  style={styles.pickerOption}
                  onPress={() => {
                    onChange('');
                    setRoleOpen(false);
                  }}>
                  <Text style={styles.pickerOptionText}>No custom role</Text>
                </Pressable>
                {(roles ?? []).map((r) => (
                  <Pressable
                    key={r._id}
                    style={styles.pickerOption}
                    onPress={() => {
                      onChange(r._id);
                      setRoleOpen(false);
                    }}>
                    <Text style={styles.pickerOptionText}>{r.name}</Text>
                  </Pressable>
                ))}
              </Picker>
            )}
          />
          <Text style={styles.helperText}>Roles control what this person can see and do.</Text>
        </View>

        {!isEdit && (
          <>
            <View style={styles.sectionHead}>
              <View style={styles.sectionIcon}>
                <SparkleIcon />
              </View>
              <Text style={styles.sectionTitle}>Account access</Text>
            </View>
            <View style={styles.noteCard}>
              <Text style={styles.noteText}>
                We&apos;ll email them an invite link to set up their own password and activate their account.
              </Text>
            </View>
          </>
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
              <PlusIcon />
              <Text style={styles.submitButtonText}>{isEdit ? 'Save changes' : 'Add staff'}</Text>
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
  introCard: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  introAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introAvatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.navy,
  },
  introText: {
    flexShrink: 1,
  },
  introTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 13.5,
    color: colors.navyInk,
  },
  introSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  field: {
    marginTop: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  half: {
    flex: 1,
    marginTop: 0,
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
  helperText: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textFaint,
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
  input: {
    marginTop: 8,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.text,
  },
  pickerField: {
    marginTop: 8,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerPlaceholder: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textFaint,
  },
  pickerValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.navyInk,
  },
  pickerOptions: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    maxHeight: 260,
  },
  pickerOption: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerOptionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
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
  sectionTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 15,
    color: colors.navyInk,
  },
  noteCard: {
    marginTop: 12,
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: 14,
  },
  noteText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
    lineHeight: 18,
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
