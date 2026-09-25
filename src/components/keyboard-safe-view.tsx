import type { PropsWithChildren } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

// Fixes two keyboard-UX gaps React Native doesn't handle automatically the
// way a web browser does (see the saved mobile-app-keyboard-ux memory): the
// keyboard can cover the focused input, and tapping elsewhere on the screen
// doesn't dismiss it. Wrap any screen that has a TextInput in this instead
// of a plain top-level View.
//
// The inner Pressable's onPress only fires for taps that don't land on a
// child touchable — nested Pressables/buttons/rows still get their own
// taps first, same as the rest of this app already relies on. If a screen
// also has a ScrollView with tappable rows, give it
// `keyboardShouldPersistTaps="handled"` too, so a tap on a row while
// another field is focused registers in one tap instead of just dismissing
// the keyboard.
export function KeyboardSafeView({ style, children }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable style={[styles.flex, style]} onPress={Keyboard.dismiss}>
        {children}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
