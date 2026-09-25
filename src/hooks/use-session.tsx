// Adapted from the Expo Router authentication guide:
// https://docs.expo.dev/router/advanced/authentication/

import {
  createContext,
  useEffect,
  use,
  useMemo,
  type PropsWithChildren,
} from "react";

import { onUnauthorized } from "@/api/auth-events";
import type { Staff } from "@/api/auth";

import { useStorageState } from "./use-storage-state";

export type Session = {
  token: string;
  staff: Staff;
};

type SessionContextValue = {
  signIn: (token: string, staff: Staff) => void;
  signOut: () => void;
  session: Session | null;
  isLoading: boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const value = use(SessionContext);
  if (!value) {
    throw new Error("useSession must be used within a <SessionProvider />");
  }
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [[isLoading, raw], setRaw] = useStorageState("session");

  const session = useMemo<Session | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  }, [raw]);

  function signOut() {
    setRaw(null);
  }

  // Lets src/api/client.ts force a sign-out on a 401 from the backend (bad,
  // expired, or since-disabled-staff token) — see src/api/auth-events.ts.
  useEffect(() => {
    onUnauthorized(signOut);
  });

  return (
    <SessionContext
      value={{
        signIn: (token, staff) => setRaw(JSON.stringify({ token, staff })),
        signOut,
        session,
        isLoading,
      }}
    >
      {children}
    </SessionContext>
  );
}
