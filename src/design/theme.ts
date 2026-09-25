// theme.ts
// iSuites design tokens — pulled straight from the design system used on the canvas.
// Import this everywhere instead of hardcoding hex values or font sizes.

export const colors = {
  navy: '#1E2A5E',        // primary brand / buttons / active states
  navyInk: '#12173A',     // headings, darkest text
  navySoft: '#EEF0FA',    // light tint backgrounds, active nav items

  coral: '#E85D4E',       // secondary accent, alerts, badges
  coralSoft: '#FDECE9',

  bg: '#F5F6FB',          // screen background
  surface: '#FFFFFF',     // card/panel background
  border: '#E7E9F3',      // default borders/dividers

  text: '#1A1D29',        // body text
  textMuted: '#767C99',   // secondary text
  textFaint: '#A4A9C1',   // placeholder / tertiary text

  success: '#1E9E6B',     // paid, settled, online
  successSoft: '#E4F8EF',

  amber: '#C97F04',       // warnings, pending, medium priority
  amberSoft: '#FBF0D9',

  purple: '#7C5CD6',      // category accent
  purpleSoft: '#F1ECFB',

  slate: '#5B6180',       // neutral category accent
  slateSoft: '#EEF0F7',

  danger: '#C23B3B',      // urgent / destructive
  dangerSoft: '#FDECEC',
} as const;

// Load these with @expo-google-fonts/plus-jakarta-sans and @expo-google-fonts/inter,
// then pass the same key names into useFonts({...}) so these strings resolve.
export const fonts = {
  headingExtraBold: 'PlusJakartaSans_800ExtraBold', // big stat numbers, splash wordmark
  headingBold: 'PlusJakartaSans_700Bold',           // screen titles, card titles
  headingSemibold: 'PlusJakartaSans_600SemiBold',   // section labels

  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',                // labels, buttons
  bodyBold: 'Inter_700Bold',
} as const;

export const radii = {
  card: 18,   // cards, drawers, modals
  input: 11,  // inputs, buttons, pills
  pill: 20,   // fully-rounded chips/badges
} as const;

// 4px base spacing unit — spacing(4) === 16, spacing(6) === 24, etc.
export const spacing = (n: number) => n * 4;

export const shadow = {
  card: {
    shadowColor: '#12173A',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  button: {
    shadowColor: '#1E2A5E',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
};
