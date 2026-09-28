import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

// Fixes the keyboard covering the focused input — React Native doesn't do
// this automatically the way a web browser does (see the saved
// mobile-app-keyboard-ux memory). Wrap any screen that has a TextInput in
// this instead of a plain top-level View.
//
// This used to also wrap children in a Pressable with onPress={Keyboard.
// dismiss}, for tap-outside-to-dismiss — but every real screen here scrolls
// (a ScrollView is always the child), and a Pressable *wrapping* a
// ScrollView competes with it for the touch responder, causing exactly the
// "scroll sometimes just doesn't register" bug reported on ai-chat.tsx and
// edit-guest.tsx. ScrollView already dismisses the keyboard on tap by
// default with zero extra wiring (see the RN docs on keyboardShouldPersist
// Taps) — `keyboardShouldPersistTaps="handled"` on the screen's own
// ScrollView is what lets a tap on an interactive row still register
// instead of just dismissing, which is exactly what the original
// mobile-app-keyboard-ux memory says to add per-screen, on the ScrollView
// itself, not via a wrapping Pressable here. Every current consumer
// already has that prop set on its main ScrollView.
export function KeyboardSafeView({ style, children }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <KeyboardAvoidingView style={[styles.flex, style]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
