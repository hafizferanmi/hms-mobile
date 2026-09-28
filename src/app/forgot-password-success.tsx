import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors, fonts, radii, shadow } from '@/design/theme';

// Mirrors hms-frontend-react's ForgotPasswordSuccess.js.

function MailIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 6.5 12 13l9-6.5" />
      <Rect x={3} y={5} width={18} height={14} rx={2} />
    </Svg>
  );
}
function ArrowRightIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

export default function ForgotPasswordSuccessScreen() {
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email?: string }>();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 }]}>
      <View style={styles.body}>
        <View style={styles.iconBadge}>
          <MailIcon />
        </View>

        <Text style={styles.heading}>Check your inbox</Text>
        <Text style={styles.subheading}>
          {email ? (
            <>
              We&apos;ve sent a password reset link to <Text style={styles.emailHighlight}>{email}</Text>.
            </>
          ) : (
            "We've sent a password reset link to your email address."
          )}
        </Text>
        <Text style={styles.hint}>Didn&apos;t get it? Check your spam folder, or try again in a few minutes.</Text>
      </View>

      <Pressable style={styles.submitButton} onPress={() => router.replace('/login')}>
        <Text style={styles.submitText}>Back to sign in</Text>
        <ArrowRightIcon />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  body: {
    alignItems: 'center',
    marginTop: 40,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heading: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 22,
    color: colors.navyInk,
    marginBottom: 10,
    textAlign: 'center',
  },
  subheading: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 21,
    textAlign: 'center',
  },
  emailHighlight: {
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textFaint,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 12,
  },
  submitButton: {
    height: 50,
    borderRadius: radii.input,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadow.button,
  },
  submitText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
