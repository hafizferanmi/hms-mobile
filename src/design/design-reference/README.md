# iSuites — Design Handoff for Claude Code

This is what to feed Claude Code when you spin up the React Native project, so it
builds screens that actually match the designs instead of guessing.

## What's in here

- **theme.ts** — every color, font name, radius and shadow from the design, as plain
  constants. Import this in your components instead of hardcoding hex codes.
- **design-reference/*.html** — one static HTML file per screen (Login, Splash, Home,
  Reservations, Filter, Notifications, Calendar, Calendar menu, Statistics, Settings,
  Home quick-add). These won't run in React Native — they're plain HTML/CSS mockups —
  but Claude Code can open and read them as a source of truth for exact layout,
  spacing, colors and copy on each screen.

## 1. Create the project

```bash
npx create-expo-app isuites-app
cd isuites-app
npx expo install expo-font @expo-google-fonts/plus-jakarta-sans @expo-google-fonts/inter
```

## 2. Drop this folder in

Copy this whole `handoff` folder into the new repo, e.g. as `design/`, so you end up
with `design/theme.ts` and `design/design-reference/*.html`.

## 3. Load the fonts once, at the app root

```tsx
import { useFonts, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
```

## 4. Open the project in Claude Code (VS Code extension or CLI) and work screen by screen

Don't ask for all 10 screens in one prompt — Claude Code matches each mockup far more
closely when it's focused on one at a time. A good first prompt:

> I'm building a hotel PMS app in Expo/React Native. `design/theme.ts` has my
> color, font and radius tokens. `design/design-reference/Main.html` is a mockup
> of the login screen — read it for the exact layout, spacing and copy, then build
> the equivalent screen as a React Native component using `theme.ts` for all
> styling (no hardcoded hex codes). Use React Navigation for screen structure.

Then repeat for each file, roughly in this order:

1. `Splash.html` → splash screen
2. `Main.html` → login screen
3. `Home.html` and `HomeAddMenu.html` → home tab + its quick-add menu
4. `Reservations.html` and `Filter.html` → reservations list + filter sheet
5. `Notifications.html` → inbox tab
6. `Calendar.html` and `CalendarMenu.html` → calendar tab + its menu
7. `Statistics.html` → statistics tab
8. `Settings.html` → settings tab

## Notes for translation to React Native

- Every layout in the mockups is plain flexbox (`display:flex`), so it maps directly
  onto RN's `View`/`StyleSheet` flex model — no CSS grid to worry about.
- Inline SVGs (icons, illustrations) can become `react-native-svg` components, or you
  can swap in an icon library (e.g. `lucide-react-native`) using the same shapes as a
  guide.
- The bottom nav in each screen maps to a React Navigation bottom tab bar — style it
  with `colors.navy` (active) / `colors.textFaint` (inactive) from `theme.ts`.
- Overlay screens (`HomeAddMenu.html`, `Filter.html`, `CalendarMenu.html`) are their
  base screen dimmed behind a menu/drawer — build them as a modal or bottom-sheet
  component layered over the real screen, not as separate routes.
