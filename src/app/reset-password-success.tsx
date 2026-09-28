import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts, radii, shadow } from '@/design/theme';

// Mirrors hms-frontend-react's ResetPasswordSuccess.js.

function CheckIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6 9 17l-5-5" />
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

export default function ResetPasswordSuccessScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 }]}>
      <View style={styles.body}>
        <View style={styles.iconBadge}>
          <CheckIcon />
        </View>

        <Text style={styles.heading}>Password reset</Text>
        <Text style={styles.subheading}>Your password has been changed successfully. You can now sign in with your new password.</Text>
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
