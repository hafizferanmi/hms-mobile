// Bridges src/api/client.ts (plain module, outside the component tree) to
// src/hooks/use-session.tsx's signOut (a React state setter). The axios
// response interceptor calls triggerUnauthorized() on a 401 from
// hms-backend-node's currentStaff middleware (bad/expired token, or a staff
// account disabled since login); SessionProvider registers its own signOut
// as the listener on mount, so the session clears and Stack.Protected in
// src/app/_layout.tsx drops the user back on the login screen immediately,
// not just on next app restart.
type Listener = () => void;

let listener: Listener | null = null;

export function onUnauthorized(fn: Listener) {
  listener = fn;
}

export function triggerUnauthorized() {
  listener?.();
}
