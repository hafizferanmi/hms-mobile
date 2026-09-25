import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts } from '@/design/theme';

/**
 * Placeholder for a tab whose screen hasn't been built yet — the tab bar in
 * src/components/app-tabs.tsx needs all 5 routes to exist, but each screen
 * (Notifications.html, Calendar.html, Statistics.html, Settings.html) gets
 * built on its own turn per design/README.md's screen-by-screen order.
 */
export function ComingSoon({ title }: { title: string }) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>This screen hasn&apos;t been built yet.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  title: {
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
});
