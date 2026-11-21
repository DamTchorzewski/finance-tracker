import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiSource } from "@/data/api-source.ts";
import { clearDemo, demoSource } from "@/data/demo-source.ts";
import type { DataSource } from "@/data/source.ts";

// Who is using the app: nobody yet, the demo, or a signed-in user with a confirmed e-mail address.
// The Firebase SDK is loaded only when it is needed (performance.md: heavy code on demand), so the demo and the
// first paint do not wait for it.

export type Session =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "demo"; source: DataSource }
  | { status: "user"; source: DataSource; email: string | null; name: string | null };

const DEMO_FLAG = "ft-session";

/** The public Firebase settings are baked into the build; without them only the demo works. */
export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID,
);

const isDemoStored = () => {
  try {
    return localStorage.getItem(DEMO_FLAG) === "demo";
  } catch {
    return false;
  }
};

interface SessionApi {
  session: Session;
  startDemo: () => void;
  signOut: () => Promise<void>;
}

const Context = createContext<SessionApi | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(() =>
    isDemoStored()
      ? { status: "demo", source: demoSource }
      : isFirebaseConfigured
        ? { status: "loading" }
        : { status: "signed-out" },
  );

  useEffect(() => {
    if (isDemoStored() || !isFirebaseConfigured) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    void Promise.all([import("firebase/auth"), import("./firebase.ts")]).then(
      ([{ onAuthStateChanged }, { getFirebaseAuth }]) => {
        const auth = getFirebaseAuth();
        if (!auth || cancelled) return;
        stop = onAuthStateChanged(auth, (user) => {
          if (isDemoStored()) return;
          if (!user || !user.emailVerified) {
            setSession({ status: "signed-out" });
            return;
          }
          setSession({
            status: "user",
            email: user.email,
            name: user.displayName,
            source: apiSource(() => user.getIdToken()),
          });
        });
      },
    );
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  const api = useMemo<SessionApi>(
    () => ({
      session,
      startDemo: () => {
        try {
          localStorage.setItem(DEMO_FLAG, "demo");
        } catch {
          // the demo works for this visit only
        }
        setSession({ status: "demo", source: demoSource });
      },
      signOut: async () => {
        if (session.status === "demo") {
          try {
            localStorage.removeItem(DEMO_FLAG);
          } catch {
            // nothing stored
          }
          clearDemo();
        } else {
          const { signOutUser } = await import("./firebase.ts");
          await signOutUser();
        }
        setSession({ status: "signed-out" });
      },
    }),
    [session],
  );

  return <Context.Provider value={api}>{children}</Context.Provider>;
}

export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("useSession needs <SessionProvider>");
  return value;
}

/** The data source of a signed-in or demo session; only for screens behind the sign-in. */
export function useSource(): DataSource {
  const { session } = useSession();
  if (session.status !== "demo" && session.status !== "user") {
    throw new Error("useSource outside a session");
  }
  return session.source;
}
