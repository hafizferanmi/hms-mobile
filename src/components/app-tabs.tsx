import Feather from '@expo/vector-icons/Feather';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { colors, fonts } from '@/design/theme';

// Matches design/design-reference/Home.html's `.navbar` / `.navitem`: the
// active tab is only distinguished by color (navy vs. text-faint), not a
// filled icon variant or a background pill, so the same Feather glyph is
// used for both states here.
const TABS: { name: string; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'inbox', label: 'Inbox', icon: 'inbox' },
  { name: 'calendar', label: 'Calendar', icon: 'calendar' },
  { name: 'statistics', label: 'Statistics', icon: 'bar-chart-2' },
  { name: 'settings', label: 'Settings', icon: 'settings' },
];

const labelStyle = {
  fontFamily: fonts.bodySemibold,
  fontSize: 10.5,
} as const;

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={colors.surface}
      iconColor={{ default: colors.textFaint, selected: colors.navy }}
      labelStyle={{
        default: { ...labelStyle, color: colors.textFaint },
        selected: { ...labelStyle, color: colors.navy },
      }}>
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Icon
            src={<NativeTabs.Trigger.VectorIcon family={Feather} name={tab.icon} />}
          />
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
