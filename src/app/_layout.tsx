import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { SessionProvider, useSession } from "@/hooks/use-session";

SplashScreen.preventAutoHideAsync();

// Module-level singleton so it survives re-renders of RootLayout (there's
// only ever one, but this keeps it out of render entirely rather than
// relying on that not changing).
const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <AppShell />
        </SessionProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const colorScheme = useColorScheme();
  const { isLoading: sessionLoading } = useSession();
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_800ExtraBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Keep the native splash screen up (it's already prevented from auto-hiding
  // above) until the design's fonts are ready and the persisted session has
  // been read, so nothing renders with a system-font flash or a flash of the
  // wrong (login vs. tabs) screen. AnimatedSplashOverlay hides the native
  // splash and plays the reveal animation once it mounts.
  const ready = (fontsLoaded || !!fontError) && !sessionLoading;
  if (!ready) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <RootNavigator />
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { session } = useSession();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="reservations" />
        <Stack.Screen name="reservations-list" />
        <Stack.Screen name="reservation/[id]" />
        <Stack.Screen name="edit-guest" />
        <Stack.Screen name="add-visitors" />
        <Stack.Screen name="add-charge" />
        <Stack.Screen name="record-payment" />
        <Stack.Screen name="more" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="check-availability" />
        <Stack.Screen name="lost-and-found" />
        <Stack.Screen name="log-found-item" />
        <Stack.Screen name="reviews" />
        <Stack.Screen name="staff-roles" />
        <Stack.Screen name="add-staff" />
        <Stack.Screen name="room-types" />
        <Stack.Screen name="role-permissions" />
        <Stack.Screen name="payment-methods" />
        <Stack.Screen name="room-type/[id]" />
        <Stack.Screen name="add-room-type" />
        <Stack.Screen name="add-room" />
        <Stack.Screen name="account" />
        <Stack.Screen name="property-info" />
        <Stack.Screen name="company-settings" />
        <Stack.Screen name="edit-policies" />
        <Stack.Screen name="custom-fields" />
        <Stack.Screen name="add-custom-field" />
        <Stack.Screen name="new-company" />
        <Stack.Screen name="guests" />
        <Stack.Screen name="guest/[id]" />
        <Stack.Screen name="housekeeping" />
        <Stack.Screen name="maintenance" />
        <Stack.Screen name="maintenance-ticket-form" />
        <Stack.Screen name="maintenance-ticket/[id]" />
        <Stack.Screen name="stats/revenue" />
        <Stack.Screen name="stats/transactions" />
        <Stack.Screen name="stats/channel" />
        <Stack.Screen name="stats/sales-revenue" />
        <Stack.Screen name="stats/metrics" />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="forgot-password-success" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="reset-password-success" />
      </Stack.Protected>
    </Stack>
  );
}
