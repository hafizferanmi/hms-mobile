import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { z } from 'zod';

import { registerCompany } from '@/api/auth';
import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { colors, fonts, radii, shadow } from '@/design/theme';
import { useSession } from '@/hooks/use-session';

// Mobile port of hms-frontend-react's Auth/RegisterPage, against the same
// POST /companies/register — see api/auth.ts's registerCompany() for how
// this differs from new-company.tsx (which adds a company to an
// *existing*, already-signed-in owner's organization; this one creates
// that organization in the first place, with no session required to call
// it at all). On success the backend signs the new owner in immediately,
// so this calls useSession().signIn() exactly like login.tsx does and
// lands straight in the authenticated app — there's no separate "check
// your email"/onboarding step to route through first.
//
// The invited-staff warning banner below has no web equivalent — it's a
// mobile-specific addition, since someone who downloaded the app on their
// own (rather than being invited into a company that already exists) is
// exactly the person this form is for, and someone who *was* invited but
// mistakenly lands here would otherwise create a second, disconnected
// company instead of joining the one that invited them.

const registerSchema = z
  .object({
    company: z.string().min(1, { error: "Enter your hotel's name" }),
    subdomain: z
      .string()
      .min(1, { error: 'Choose a subdomain' })
      .regex(/^[a-z0-9-]+$/, { error: 'Lowercase letters, numbers, and hyphens only' }),
    manager: z.string().min(1, { error: 'Enter your name' }),
    email: z.email({ error: 'Enter a valid email address' }),
    password: z.string().min(1, { error: 'Password is required' }),
    confirmPassword: z.string().min(1, { error: 'Confirm your password' }),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match' });
    }
  });
type RegisterFormValues = z.infer<typeof registerSchema>;

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}
function InfoIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth={2.2}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 11v5" strokeLinecap="round" />
      <Circle cx={12} cy={8} r={0.9} fill={colors.navy} stroke="none" />
    </Svg>
  );
}
function BuildingIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 21h18M6 21V7l6-4 6 4v14M9 21v-6h6v6" />
    </Svg>
  );
}
function GlobeIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </Svg>
  );
}
function PersonIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={8} r={3.5} />
      <Path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
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

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { company: '', subdomain: '', manager: '', email: '', password: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: RegisterFormValues) => registerCompany(values),
    onSuccess: ({ token, staff }) => signIn(token, staff),
  });

  function onSubmit(values: RegisterFormValues) {
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

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Create your account</Text>
        <Text style={styles.subheading}>Set up your hotel and start managing it in minutes.</Text>

        <View style={styles.banner}>
          <InfoIcon />
          <Text style={styles.bannerText}>
            Already invited to join a hotel&apos;s team? Don&apos;t sign up here — this creates a brand-new,
            separate company. Use the sign-in link from your invite email instead.
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Company name</Text>
          <View style={styles.inputWrapper}>
            <View pointerEvents="none" style={styles.inputIconLeft}>
              <BuildingIcon />
            </View>
            <Controller
              control={control}
              name="company"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Your hotel's name"
                  placeholderTextColor={colors.textFaint}
                  style={styles.input}
                />
              )}
            />
          </View>
          {errors.company && <Text style={styles.fieldError}>{errors.company.message}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Subdomain</Text>
          <View style={styles.inputWrapper}>
            <View pointerEvents="none" style={styles.inputIconLeft}>
              <GlobeIcon />
            </View>
            <Controller
              control={control}
              name="subdomain"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={(text) => onChange(text.toLowerCase())}
                  onBlur={onBlur}
                  placeholder="yourhotel"
                  placeholderTextColor={colors.textFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              )}
            />
          </View>
          <Text style={styles.fieldHint}>{errors.subdomain?.message ?? 'This will be part of your workspace address'}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Your name</Text>
          <View style={styles.inputWrapper}>
            <View pointerEvents="none" style={styles.inputIconLeft}>
              <PersonIcon />
            </View>
            <Controller
              control={control}
              name="manager"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Full name"
                  placeholderTextColor={colors.textFaint}
                  style={styles.input}
                />
              )}
            />
          </View>
          {errors.manager && <Text style={styles.fieldError}>{errors.manager.message}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email address</Text>
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
          <Text style={styles.label}>Password</Text>
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
                  placeholder="Create a password"
                  placeholderTextColor={colors.textFaint}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={[styles.input, styles.inputWithTrailingIcon]}
                />
              )}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} style={styles.inputIconRight} accessibilityLabel="Toggle password visibility">
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
                  placeholder="Re-enter your password"
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
          {mutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Create account</Text>}
        </Pressable>

        <Text style={styles.footerText}>
          Already have an account?{' '}
          <Text style={styles.footerLink} onPress={() => router.back()}>
            Sign in
          </Text>
        </Text>
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
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 28,
    paddingTop: 4,
    paddingBottom: 24,
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
    marginBottom: 18,
  },
  banner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.navySoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 22,
  },
  bannerText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.navy,
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
  fieldHint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textFaint,
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
