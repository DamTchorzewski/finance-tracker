import { getApps, initializeApp } from "firebase/app";
import {
  applyActionCode,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  initializeAuth,
  browserPopupRedirectResolver,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth";

// The public settings of the Firebase web app (not secrets), baked into the build from VITE_* variables. On Firebase
// Hosting, VITE_FIREBASE_AUTH_DOMAIN is the site's own domain, so the sign-in helper runs on the same site.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

let auth: Auth | null = null;

/** Created on first use, so the demo runs without the Firebase settings and without loading more than it needs. */
export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured) return null;
  if (!auth) {
    const app = getApps()[0] ?? initializeApp(config);
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  }
  return auth;
}

function requireAuth() {
  const value = getFirebaseAuth();
  if (!value) throw new AuthProblem("auth/not-configured");
  return value;
}

/** A sign-in error with a Firebase code; the screens turn the code into a message. */
export class AuthProblem extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "AuthProblem";
    this.code = code;
  }
}

const problem = (err: unknown) =>
  new AuthProblem((err as { code?: string } | null)?.code ?? "auth/unknown");

/** Where the link in the confirmation e-mail leads: this site, which applies it (/auth/action). */
const actionSettings = () => ({ url: `${location.origin}/login?confirmed=1` });

export async function signUp(name: string, email: string, password: string) {
  try {
    const { user } = await createUserWithEmailAndPassword(requireAuth(), email, password);
    await updateProfile(user, { displayName: name });
    await sendEmailVerification(user, actionSettings());
    await signOut(requireAuth());
  } catch (err) {
    throw problem(err);
  }
}

/** E-mail sign-in; an unconfirmed address gets a new link and stays signed out. */
export async function signIn(email: string, password: string): Promise<User> {
  try {
    const { user } = await signInWithEmailAndPassword(requireAuth(), email, password);
    if (!user.emailVerified) {
      await sendEmailVerification(user, actionSettings());
      await signOut(requireAuth());
      throw new AuthProblem("auth/email-not-verified");
    }
    return user;
  } catch (err) {
    throw err instanceof AuthProblem ? err : problem(err);
  }
}

/** Google in a pop-up; where the browser blocks pop-ups (some phones), a full-page redirect instead. */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(requireAuth(), provider);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (
      code === "auth/popup-blocked" ||
      code === "auth/operation-not-supported-in-this-environment"
    ) {
      await signInWithRedirect(requireAuth(), provider);
      return;
    }
    throw problem(err);
  }
}

export async function signOutUser() {
  const value = getFirebaseAuth();
  if (value) await signOut(value);
}

/** The link from the confirmation e-mail: ?mode=verifyEmail&oobCode=… */
export async function applyEmailLink(oobCode: string) {
  try {
    await applyActionCode(requireAuth(), oobCode);
  } catch (err) {
    throw problem(err);
  }
}
