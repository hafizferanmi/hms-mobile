import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, type Control, type FieldValues, type Path as FieldPath } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { z } from 'zod';

import { changeMyPassword, updateMyProfile } from '@/api/account';
import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { colors, fonts, radii, shadow } from '@/design/theme';
import { useSession } from '@/hooks/use-session';

// -----------------------------------------------------------------------
// New screen reachable from Settings' "Staff" row (renamed from
// "Accounts" — see (tabs)/settings.tsx). Mirrors hms-frontend-react's
// AccountPage: two independent forms/submissions against the current
// staff's own profile, not src/api/staff.ts's admin staff-management
// endpoints — PUT /staffs/me (PersonalInfoCard.js) and POST /staffs/
// change-password (PasswordCard.js), see src/api/account.ts.
//
// Pre-fills from the session's own staff object (already fresh from
// login) rather than an extra GET /staffs/me round trip. A successful
// profile save re-signs-in with the same token and the updated staff
// object so Settings' header (and anywhere else reading session.staff)
// reflects the change immediately without a re-login.
// -----------------------------------------------------------------------

const profileSchema = z.object({
  name: z.string().min(1, { error: 'Full name is required' }),
  email: z.email({ error: 'Enter a valid email address' }),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || (v.length >= 11 && v.length <= 15), { error: 'Enter a valid phone number' }),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, { error: 'Current password is required' }),
    newPassword: z.string().min(6, { error: 'New password must be at least 6 characters' }),
    confirmPassword: z.string().min(1, { error: 'Confirm your new password' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: 'Passwords must match',
    path: ['confirmPassword'],
  });
type PasswordFormValues = z.infer<typeof passwordSchema>;

function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
function ProfileSectionIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </Svg>
  );
}
function LockSectionIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={16} r={1} />
      <Path d="M6 10V7a6 6 0 0 1 12 0v3" />
      <Path d="M5 10h14v10H5z" />
    </Svg>
  );
}
function EyeIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <Circle cx={12} cy={12} r={3} />
    </Svg>
  );
}
function SaveIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <Path d="M17 21v-8H7v8M7 3v5h8" />
    </Svg>
  );
}
function CheckCircleIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="m8 12 2.5 2.5L16 9" />
    </Svg>
  );
}

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={styles.sectionHeaderIcon}>{icon}</View>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
        <Text style={styles.sectionHeaderDescription}>{description}</Text>
      </View>
    </View>
  );
}

function ControlledField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  keyboardType,
  secureTextEntry,
  rightAccessory,
  error,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  rightAccessory?: React.ReactNode;
  error?: string;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
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
              keyboardType={keyboardType}
              secureTextEntry={secureTextEntry}
              autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
              style={[styles.input, Boolean(rightAccessory) && styles.inputWithAccessory]}
            />
          )}
        />
        {rightAccessory && <View style={styles.inputAccessory}>{rightAccessory}</View>}
      </View>
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

export default function AccountScreen() {
  const { session, signIn } = useSession();
  const [showPasswords, setShowPasswords] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const {
    control: profileControl,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isDirty: profileDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: session?.staff.name ?? '',
      email: session?.staff.email ?? '',
      phone: session?.staff.phone ?? '',
    },
  });

  const profileMutation = useMutation({
    mutationFn: (values: ProfileFormValues) => updateMyProfile(values),
    onSuccess: (updatedStaff) => {
      if (session) signIn(session.token, updatedStaff);
      setProfileSaved(true);
    },
  });

  function onSubmitProfile(values: ProfileFormValues) {
    setProfileSaved(false);
    profileMutation.mutate(values);
  }

  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  const passwordMutation = useMutation({
    mutationFn: (values: PasswordFormValues) => changeMyPassword(values),
    onSuccess: () => {
      resetPasswordForm();
      setPasswordSaved(true);
    },
  });

  function onSubmitPassword(values: PasswordFormValues) {
    setPasswordSaved(false);
    passwordMutation.mutate(values);
  }

  // Unreachable in practice — this screen only mounts inside
  // _layout.tsx's authenticated Stack.Protected block. Checked after
  // every hook above (rather than as an early return before them) so
  // hook call order never depends on it.
  if (!session) return null;

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <CloseIcon />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <SectionHeader
          icon={<ProfileSectionIcon />}
          title="Personal information"
          description="Your name and contact details as they appear to guests and staff"
        />
        <View style={styles.sectionCard}>
          <ControlledField
            control={profileControl}
            name="name"
            label="FULL NAME"
            error={profileErrors.name?.message}
          />
          <ControlledField
            control={profileControl}
            name="email"
            label="EMAIL ADDRESS"
            keyboardType="email-address"
            error={profileErrors.email?.message}
          />
          <ControlledField
            control={profileControl}
            name="phone"
            label="PHONE NUMBER"
            keyboardType="phone-pad"
            error={profileErrors.phone?.message}
          />

          {profileMutation.isError && (
            <Text style={styles.submitErrorText}>{profileMutation.error.message}</Text>
          )}
          {profileSaved && !profileMutation.isPending && (
            <View style={styles.savedRow}>
              <CheckCircleIcon />
              <Text style={styles.savedText}>Profile updated successfully</Text>
            </View>
          )}

          <View style={styles.sectionFooter}>
            <Pressable
              style={[styles.saveButton, !profileDirty && styles.saveButtonDisabled]}
              disabled={!profileDirty || profileMutation.isPending}
              onPress={handleProfileSubmit(onSubmitProfile)}>
              {profileMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <SaveIcon />
                  <Text style={styles.saveButtonText}>Save changes</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionHeaderSpaced}>
          <SectionHeader
            icon={<LockSectionIcon />}
            title="Password & security"
            description="Update your password to keep your account secure"
          />
        </View>
        <View style={styles.sectionCard}>
          <ControlledField
            control={passwordControl}
            name="oldPassword"
            label="CURRENT PASSWORD"
            secureTextEntry={!showPasswords}
            rightAccessory={
              <Pressable onPress={() => setShowPasswords((v) => !v)} hitSlop={8}>
                <EyeIcon />
              </Pressable>
            }
            error={passwordErrors.oldPassword?.message}
          />
          <ControlledField
            control={passwordControl}
            name="newPassword"
            label="NEW PASSWORD"
            secureTextEntry={!showPasswords}
            error={passwordErrors.newPassword?.message}
          />
          <ControlledField
            control={passwordControl}
            name="confirmPassword"
            label="CONFIRM NEW PASSWORD"
            secureTextEntry={!showPasswords}
            error={passwordErrors.confirmPassword?.message}
          />

          {passwordMutation.isError && (
            <Text style={styles.submitErrorText}>{passwordMutation.error.message}</Text>
          )}
          {passwordSaved && !passwordMutation.isPending && (
            <View style={styles.savedRow}>
              <CheckCircleIcon />
              <Text style={styles.savedText}>Password updated successfully</Text>
            </View>
          )}

          <View style={styles.sectionFooter}>
            <Pressable
              style={styles.saveButton}
              disabled={passwordMutation.isPending}
              onPress={handlePasswordSubmit(onSubmitPassword)}>
              {passwordMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Update password</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
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
    alignItems: 'center',
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
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  sectionHeaderSpaced: {
    marginTop: 26,
  },
  sectionHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  sectionHeaderTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 15,
    color: colors.navyInk,
  },
  sectionHeaderDescription: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  sectionCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 16,
    gap: 14,
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    marginTop: 6,
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
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
  inputWithAccessory: {
    paddingRight: 42,
  },
  inputAccessory: {
    position: 'absolute',
    right: 12,
  },
  fieldError: {
    marginTop: 5,
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.danger,
  },
  submitErrorText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
    color: colors.danger,
    textAlign: 'center',
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  savedText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
    color: colors.success,
  },
  sectionFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  saveButton: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: radii.input,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    ...shadow.button,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
});
