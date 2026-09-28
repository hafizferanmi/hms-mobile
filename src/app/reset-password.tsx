import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { z } from 'zod';

import { resetPassword } from '@/api/auth';
import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { colors, fonts, radii, shadow } from '@/design/theme';

// Mobile port of hms-frontend-react's Auth/ResetPasswordPage, against the
// same POST /staffs/reset-password. One real gap versus web, not just a
// styling difference: businesslogic/auth.js#recoverStaffPassword emails a
// link to `${FRONTEND_URL}/reset-password/:token` — a web URL — so tapping
// it today opens the web app in a browser, not this screen; there's no
// deep-link scheme wired up yet to route that link into the app instead.
// Until that exists, this screen is reached with `token` unset, and the
// "Reset code" field lets someone paste the token out of that emailed link
// manually. If a deep link is added later, opening it would pre-fill
// `token` via the route param and this field would just already be filled
// in for them.
const resetPasswordSchema = z
  .object({
    email: z.email({ error: 'Enter a valid email address' }),
    token: z.string().min(1, { error: 'Enter the reset code from your email' }),
    password: z.string().min(6, { error: 'Password must be at least 6 characters' }),
    confirmPassword: z.string().min(1, { error: 'Confirm your new password' }),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match' });
    }
  });
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function MailIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 6.5 12 13l9-6.5" />
      <Rect x={3} y={5} width={18} height={14} rx={2} />
    </Svg>
  );
}
function KeyIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={8} cy={15} r={4} />
      <Path d="M10.5 12.5 20 3M16 7l3 3M13 10l2 2" />
    </Svg>
  );
}
function LockIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={5} y={11} width={14} height={9} rx={2} />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  );
}
function EyeIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <Circle cx={12} cy={12} r={3} />
    </Svg>
  );
}

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { token: tokenParam, email: emailParam } = useLocalSearchParams<{ token?: string; email?: string }>();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: emailParam ?? '',
      token: tokenParam ?? '',
      password: '',
      confirmPassword: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordFormValues) => resetPassword(values),
    onSuccess: () => router.push('/reset-password-success'),
  });

  function onSubmit(values: ResetPasswordFormValues) {
    if (mutation.isPending) return;
    mutation.reset();
    mutation.mutate(values);
  }

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackIcon />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.heading}>Set a new password</Text>
        <Text style={styles.subheading}>Enter your email, the reset code from your email, and a new password.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrapper}>
            <View pointerEvents="none" style={styles.inputIconLeft}>
              <MailIcon />
            </View>
            <Controller
              control={control}
              name="email"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="you@yourhotel.com"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={styles.input}
                />
              )}
            />
          </View>
          {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Reset code</Text>
          <View style={styles.inputWrapper}>
            <View pointerEvents="none" style={styles.inputIconLeft}>
              <KeyIcon />
            </View>
            <Controller
              control={control}
              name="token"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="From the link in your email"
                  placeholderTextColor={colors.textFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              )}
            />
          </View>
          {errors.token && <Text style={styles.fieldError}>{errors.token.message}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>New password</Text>
          <View style={styles.inputWrapper}>
            <View pointerEvents="none" style={styles.inputIconLeft}>
              <LockIcon />
            </View>
            <Controller
              control={control}
              name="password"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.textFaint}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={[styles.input, styles.inputWithTrailingIcon]}
                />
              )}
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={8}
              style={styles.inputIconRight}
              accessibilityLabel="Toggle password visibility">
              <EyeIcon />
            </Pressable>
          </View>
          {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Confirm password</Text>
          <View style={styles.inputWrapper}>
            <View pointerEvents="none" style={styles.inputIconLeft}>
              <LockIcon />
            </View>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textFaint}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  style={[styles.input, styles.inputWithTrailingIcon]}
                />
              )}
            />
            <Pressable
              onPress={() => setShowConfirm((v) => !v)}
              hitSlop={8}
              style={styles.inputIconRight}
              accessibilityLabel="Toggle confirm password visibility">
              <EyeIcon />
            </Pressable>
          </View>
          {errors.confirmPassword && <Text style={styles.fieldError}>{errors.confirmPassword.message}</Text>}
        </View>

        {mutation.isError && <Text style={styles.errorText}>{mutation.error.message}</Text>}

        <Pressable
          style={[styles.submitButton, mutation.isPending && styles.submitButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={mutation.isPending}>
          {mutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Reset password</Text>}
        </Pressable>

        <Text style={styles.footerText}>
          Remembered your password?{' '}
          <Text style={styles.footerLink} onPress={() => router.replace('/login')}>
            Sign in
          </Text>
        </Text>
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
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 4,
  },
  heading: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 24,
    color: colors.navyInk,
    marginBottom: 8,
  },
  subheading: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 21,
    marginBottom: 24,
  },
  field: {
    gap: 6,
    marginBottom: 18,
  },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.text,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    backgroundColor: colors.surface,
    paddingLeft: 42,
    paddingRight: 14,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  inputWithTrailingIcon: {
    paddingRight: 42,
  },
  inputIconLeft: {
    position: 'absolute',
    left: 14,
    height: 50,
    justifyContent: 'center',
    zIndex: 1,
  },
  inputIconRight: {
    position: 'absolute',
    right: 10,
    width: 28,
    height: 28,
    top: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldError: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.danger,
    marginTop: 6,
  },
  errorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.danger,
    marginBottom: 8,
  },
  submitButton: {
    height: 50,
    marginTop: 8,
    borderRadius: radii.input,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.button,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  footerText: {
    marginTop: 24,
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  footerLink: {
    fontFamily: fonts.bodySemibold,
    color: colors.coral,
  },
});
