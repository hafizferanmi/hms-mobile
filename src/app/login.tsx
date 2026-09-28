import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { z } from "zod";

import { login } from "@/api/auth";
import { colors, fonts, radii, shadow } from "@/design/theme";
import { useSession } from "@/hooks/use-session";

// First screen wired with react-hook-form + zod — see the memory note
// saved from this conversation: this pairing (not the sibling web apps'
// older react-hook-form@6 + yup@0.29) is the standard going forward for
// every mobile-app form, especially once each one talks to the real API.
const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address" }),
  password: z.string().min(1, { error: "Password is required" }),
});
type LoginFormValues = z.infer<typeof loginSchema>;

// One-off colors lifted straight from design/design-reference/Main.html — not
// in design/theme.ts because they're only used for this screen's hero
// decoration and logomark (same as src/components/splash-content.tsx).
const DECORATIVE = {
  ringBase: "#2B3A78",
  ringBlue: "#7C93FF",
  logomarkAmber: "#F0B429",
  tagline: "#B9C0E8",
};

function BrandMark() {
  return (
    <Svg width={22} height={17} viewBox="0 0 22 17">
      <Rect x={0} y={7} width={5} height={10} rx={1} fill={colors.coral} />
      <Rect
        x={8.5}
        y={2}
        width={5}
        height={15}
        rx={1}
        fill={DECORATIVE.logomarkAmber}
      />
      <Rect
        x={17}
        y={9}
        width={5}
        height={8}
        rx={1}
        fill={DECORATIVE.ringBlue}
      />
    </Svg>
  );
}

function MailIcon() {
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.textFaint}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M3 6.5 12 13l9-6.5" />
      <Rect x={3} y={5} width={18} height={14} rx={2} />
    </Svg>
  );
}

function LockIcon() {
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.textFaint}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x={5} y={11} width={14} height={9} rx={2} />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  );
}

function EyeIcon() {
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.textFaint}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <Circle cx={12} cy={12} r={3} />
    </Svg>
  );
}

function GoogleIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.2-5.5 4.2-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.6C16.9 3.4 14.7 2.4 12 2.4 6.9 2.4 2.7 6.6 2.7 11.7S6.9 21 12 21c6.9 0 9.6-4.8 9.6-7.3 0-.5 0-.9-.1-1.2H12z"
      />
    </Svg>
  );
}

function Checkbox({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      style={[styles.checkbox, checked && styles.checkboxChecked]}
    >
      {checked && (
        <Svg width={11} height={11} viewBox="0 0 16 16">
          <Path
            d="M3 8.5 6.5 12 13 4.5"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </Pressable>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();

  const [showPassword, setShowPassword] = useState(false);
  // Cosmetic for now — could later decide whether the session token is
  // persisted (useStorageState/SecureStore) or kept in-memory only.
  const [rememberMe, setRememberMe] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: (values: LoginFormValues) =>
      login(values.email, values.password),
    onSuccess: ({ token, staff }) => signIn(token, staff),
  });

  function onSubmit(values: LoginFormValues) {
    if (loginMutation.isPending) return;
    loginMutation.reset();
    loginMutation.mutate(values);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.screen}>
        <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <Svg
            width={140}
            height={140}
            viewBox="0 0 140 140"
            style={styles.ringTop}
          >
            <Circle cx={70} cy={70} r={70} fill={DECORATIVE.ringBase} />
          </Svg>
          <Svg
            width={90}
            height={90}
            viewBox="0 0 90 90"
            style={styles.ringBottom}
          >
            <Circle cx={45} cy={45} r={45} fill={DECORATIVE.ringBase} />
          </Svg>

          <View style={styles.brandRow}>
            <BrandMark />
            <Text style={styles.brandName}>iSuites</Text>
          </View>

          <View style={styles.heroTextBlock}>
            <Text style={styles.heroTitle}>Welcome back</Text>
            <Text style={styles.heroSubtitle}>
              Sign in to manage your property
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.form}>
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
              {errors.email && (
                <Text style={styles.fieldError}>{errors.email.message}</Text>
              )}
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
                      placeholder="••••••••"
                      placeholderTextColor={colors.textFaint}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete="password"
                      style={[styles.input, styles.inputWithTrailingIcon]}
                    />
                  )}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}
                  style={styles.inputIconRight}
                  accessibilityLabel="Show password"
                  accessibilityRole="button"
                >
                  <EyeIcon />
                </Pressable>
              </View>
              {errors.password && (
                <Text style={styles.fieldError}>{errors.password.message}</Text>
              )}
            </View>

            <View style={styles.optionsRow}>
              <Pressable
                onPress={() => setRememberMe((v) => !v)}
                style={styles.rememberRow}
                hitSlop={8}
              >
                <Checkbox
                  checked={rememberMe}
                  onToggle={() => setRememberMe((v) => !v)}
                />
                <Text style={styles.rememberText}>Remember me</Text>
              </Pressable>
              <Pressable hitSlop={8} onPress={() => router.push("/forgot-password")}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            </View>

            {loginMutation.isError && (
              <Text style={styles.errorText}>
                {loginMutation.error.message}{" "}
                {process.env.EXPO_PUBLIC_API_BASE_URL}
              </Text>
            )}

            <Pressable
              style={[
                styles.submitButton,
                loginMutation.isPending && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>Log In</Text>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable style={styles.googleButton}>
              <GoogleIcon />
              <Text style={styles.googleText}>Sign in with Google</Text>
            </Pressable>
          </View>

          <View style={styles.flex} />

          <Text style={styles.footerText}>
            New to iSuites?{" "}
            <Text style={styles.footerLink} onPress={() => router.push("/signup")}>
              Create one
            </Text>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  hero: {
    flexShrink: 0,
    backgroundColor: colors.navy,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingHorizontal: 28,
    gap: 28,
    overflow: "hidden",
  },
  ringTop: {
    position: "absolute",
    top: -46,
    right: -46,
    opacity: 0.5,
  },
  ringBottom: {
    position: "absolute",
    top: 150,
    right: -20,
    opacity: 0.35,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandName: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 20,
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  heroTextBlock: {
    gap: 6,
  },
  heroTitle: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 28,
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: DECORATIVE.tagline,
    lineHeight: 21,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingTop: 36,
    paddingHorizontal: 28,
    paddingBottom: 28,
    // Bespoke to this overlapping "sheet" edge — not the shared shadow.card
    // token, which is tuned for regular cards sitting flat on the background.
    shadowColor: "#12173A",
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 4,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.text,
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
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
    position: "absolute",
    left: 14,
    height: 50,
    justifyContent: "center",
    zIndex: 1,
  },
  inputIconRight: {
    position: "absolute",
    right: 10,
    width: 28,
    height: 28,
    top: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  rememberText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  forgotText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.coral,
  },
  errorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.danger,
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
    alignItems: "center",
    justifyContent: "center",
    ...shadow.button,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: "#FFFFFF",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textFaint,
  },
  googleButton: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  googleText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.text,
  },
  footerText: {
    textAlign: "center",
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  footerLink: {
    fontFamily: fonts.bodySemibold,
    color: colors.coral,
  },
});
