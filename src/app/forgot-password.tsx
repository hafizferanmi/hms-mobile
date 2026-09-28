import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { z } from 'zod';

import { forgotPassword } from '@/api/auth';
import { KeyboardSafeView } from '@/components/keyboard-safe-view';
import { colors, fonts, radii, shadow } from '@/design/theme';

// Mobile port of hms-frontend-react's Auth/ForgotPasswordPage — same two
// screens (request the email here, confirm on forgot-password-success.tsx)
// against the same POST /staffs/recover-password. See api/auth.ts's
// forgotPassword() for why this deliberately navigates to the confirmation
// screen on both success AND failure: showing a different outcome for
// "email not found" would let this screen be used to check who has an
// account, which hms-frontend-react's own ForgotPasswordFormContainer
// avoids by never even checking `success` before confirming.

const forgotPasswordSchema = z.object({
  email: z.email({ error: 'Enter a valid email address' }),
});
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

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

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: (email: string) => forgotPassword(email),
  });

  function onSubmit(values: ForgotPasswordFormValues) {
    if (mutation.isPending) return;
    mutation.mutate(values.email, {
      // Fires on success or failure alike — see the file-level comment.
      onSettled: () => router.push({ pathname: '/forgot-password-success', params: { email: values.email } }),
    });
  }

  return (
    <KeyboardSafeView style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackIcon />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.heading}>Forgot password?</Text>
        <Text style={styles.subheading}>
          Enter the email on your account and we&apos;ll send you a link to reset your password.
        </Text>

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

        <Pressable
          style={[styles.submitButton, mutation.isPending && styles.submitButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={mutation.isPending}>
          {mutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Send reset link</Text>}
        </Pressable>

        <Text style={styles.footerText}>
          Remembered your password?{' '}
          <Text style={styles.footerLink} onPress={() => router.back()}>
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
    paddingTop: 8,
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
    marginBottom: 28,
  },
  field: {
    gap: 6,
    marginBottom: 24,
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
  inputIconLeft: {
    position: 'absolute',
    left: 14,
    height: 50,
    justifyContent: 'center',
    zIndex: 1,
  },
  fieldError: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.danger,
    marginTop: 6,
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
    marginTop: 28,
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
