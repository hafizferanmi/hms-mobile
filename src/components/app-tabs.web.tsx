import Feather from '@expo/vector-icons/Feather';
import { TabList, TabSlot, Tabs, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/design/theme';

// Web doesn't render NativeTabs, so this mirrors design/design-reference/Home.html's
// `.navbar` directly with a plain bottom bar instead.
// `as const` keeps each `href` a string literal so it matches expo-router's
// generated typed-route union (experiments.typedRoutes in app.json).
const TABS = [
  { name: 'index', href: '/', label: 'Home', icon: 'home' },
  { name: 'ai-chat', href: '/ai-chat', label: 'AI Chat', icon: 'message-circle' },
  { name: 'calendar', href: '/calendar', label: 'Calendar', icon: 'calendar' },
  { name: 'statistics', href: '/statistics', label: 'Statistics', icon: 'bar-chart-2' },
  { name: 'settings', href: '/settings', label: 'Settings', icon: 'settings' },
] as const satisfies {
  name: string;
  href: string;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
}[];

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <View style={styles.navbar}>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton label={tab.label} icon={tab.icon} />
            </TabTrigger>
          ))}
        </View>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  label,
  icon,
  isFocused,
  ...props
}: TabTriggerSlotProps & { label: string; icon: React.ComponentProps<typeof Feather>['name'] }) {
  const tint = isFocused ? colors.navy : colors.textFaint;
  return (
    <Pressable {...props} style={styles.navItem}>
      <Feather name={icon} size={22} color={tint} />
      <Text style={[styles.navLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: '100%',
  },
  navbar: {
    height: 64,
    flexShrink: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navItem: {
    alignItems: 'center',
    gap: 3,
  },
  navLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10.5,
  },
});
