import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthProblem, applyEmailLink, signIn, signInWithGoogle, signUp } from "@/auth/firebase.ts";
import { isFirebaseConfigured, useSession } from "@/auth/session.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, Input } from "@/components/ui/field.tsx";
import { useI18n } from "@/i18n/i18n.tsx";

const MESSAGES: Record<string, { pl: string; en: string }> = {
  "auth/invalid-credential": {
    pl: "Nieprawidłowy e-mail lub hasło",
    en: "Wrong e-mail or password",
  },
  "auth/invalid-email": { pl: "Wpisz poprawny adres e-mail", en: "Enter a valid e-mail address" },
  "auth/email-already-in-use": {
    pl: "Ten e-mail ma już konto",
    en: "This e-mail already has an account",
  },
  "auth/weak-password": { pl: "Hasło jest za słabe", en: "The password is too weak" },
  "auth/too-many-requests": {
    pl: "Za dużo prób, spróbuj za chwilę",
    en: "Too many attempts, try again later",
  },
  "auth/popup-closed-by-user": {
    pl: "Okno Google zostało zamknięte",
    en: "The Google window was closed",
  },
  "auth/network-request-failed": { pl: "Brak połączenia", en: "No connection" },
  "auth/email-not-verified": {
    pl: "Adres nie jest jeszcze potwierdzony: wysłaliśmy nowy link",
    en: "The address is not confirmed yet: we sent a new link",
  },
  "auth/not-configured": {
    pl: "Logowanie nie jest skonfigurowane",
    en: "Sign-in is not configured",
  },
};

function Preview() {
  // a calm picture of what the app does, drawn with the design tokens (the brand illustration replaces it later)
  const bars = [38, 62, 45, 80, 56, 70, 92];
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-10 -z-10 rounded-full bg-accent/25 blur-3xl" />
      <div className="rounded-sheet border border-border bg-surface p-5 shadow-float">
        <p className="text-xs font-semibold text-muted">Saldo</p>
        <p className="tabular mt-1 text-3xl font-extrabold tracking-tight">24 860,40 zł</p>
        <div className="mt-5 flex h-24 items-end gap-2">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-lg bg-accent/80"
              style={{ height: `${h}%`, opacity: 0.45 + i * 0.08 }}
            />
          ))}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
          {["EUR 4,4559", "USD 4,0613", "GBP 5,0412"].map((rate) => (
            <span key={rate} className="tabular rounded-xl bg-surface-2 py-2 font-semibold">
              {rate}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { t, locale, fill } = useI18n();
  const { startDemo } = useSession();
  const navigate = useNavigate();
  const search: { confirmed?: number; mode?: string; oobCode?: string } = useSearch({
    strict: false,
  });
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const message = (err: unknown) =>
    MESSAGES[err instanceof AuthProblem ? err.code : ""]?.[locale] ?? t.somethingWrong;

  // the link from the confirmation e-mail lands here
  useEffect(() => {
    if (search.mode === "verifyEmail" && search.oobCode) {
      applyEmailLink(search.oobCode)
        .then(() => toast.success(t.auth.emailConfirmed))
        .catch((err: unknown) => toast.error(message(err)));
    } else if (search.confirmed) {
      toast.success(t.auth.emailConfirmed);
    }
    // once per visit of the link
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const schema = z.object({
    name: mode === "sign-up" ? z.string().trim().min(1, t.required).max(60) : z.string().optional(),
    email: z.email(
      locale === "pl" ? "Wpisz poprawny adres e-mail" : "Enter a valid e-mail address",
    ),
    password: z.string().min(mode === "sign-up" ? 8 : 1, t.auth.passwordHint),
  });
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const errors = form.formState.errors;

  const submit = form.handleSubmit(async (values) => {
    setBusy(true);
    try {
      if (mode === "sign-up") {
        await signUp(values.name ?? "", values.email, values.password);
        setSentTo(values.email);
      } else {
        await signIn(values.email, values.password);
        await navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(message(err));
    } finally {
      setBusy(false);
    }
  });

  const signUpMode = mode === "sign-up";

  return (
    <main id="main" className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-surface-2 p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <img src="/icon.svg" alt="" width={36} height={36} className="size-9 rounded-xl" />
          <span className="font-extrabold tracking-tight">{t.appName}</span>
        </div>
        <Preview />
        <p className="max-w-md text-sm text-muted">{t.auth.lead}</p>
      </section>

      <section className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img src="/icon.svg" alt="" width={36} height={36} className="size-9 rounded-xl" />
            <span className="font-extrabold tracking-tight">{t.appName}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-balance">
            {signUpMode ? t.auth.signUp : t.auth.title}
          </h1>
          <p className="mt-2 text-sm text-muted lg:hidden">{t.auth.lead}</p>

          {sentTo ? (
            <p role="status" className="mt-8 rounded-2xl bg-accent-soft p-4 text-sm font-semibold">
              {fill(t.auth.checkEmail, { email: sentTo })}
            </p>
          ) : (
            <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-4">
              {!isFirebaseConfigured && (
                <p role="note" className="rounded-2xl bg-surface-2 p-3 text-sm">
                  {t.auth.notConfigured}
                </p>
              )}
              {signUpMode && (
                <Field label={t.auth.name} error={errors.name?.message}>
                  {(props) => (
                    <Input {...props} autoComplete="given-name" {...form.register("name")} />
                  )}
                </Field>
              )}
              <Field label={t.auth.email} error={errors.email?.message}>
                {(props) => (
                  <Input
                    {...props}
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    {...form.register("email")}
                  />
                )}
              </Field>
              <Field
                label={t.auth.password}
                hint={signUpMode ? t.auth.passwordHint : undefined}
                error={errors.password?.message}
              >
                {(props) => (
                  <Input
                    {...props}
                    type="password"
                    autoComplete={signUpMode ? "new-password" : "current-password"}
                    {...form.register("password")}
                  />
                )}
              </Field>
              <Button
                type="submit"
                size="lg"
                disabled={busy || !isFirebaseConfigured}
                className="mt-2"
              >
                {signUpMode ? t.auth.signUp : t.auth.signIn}
                <ArrowRight aria-hidden="true" />
              </Button>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-border" />
                {t.auth.or}
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button
                variant="outline"
                size="lg"
                disabled={busy || !isFirebaseConfigured}
                onClick={async () => {
                  try {
                    await signInWithGoogle();
                    await navigate({ to: "/" });
                  } catch (err) {
                    toast.error(message(err));
                  }
                }}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"
                  />
                </svg>
                {t.auth.google}
              </Button>
            </form>
          )}

          <div className="mt-8 rounded-2xl border border-dashed border-border p-4">
            <Button variant="secondary" className="w-full" onClick={startDemo}>
              <Sparkles aria-hidden="true" />
              {t.auth.demo}
            </Button>
            <p className="mt-2 text-center text-xs text-muted">{t.auth.demoNote}</p>
          </div>

          <p className="mt-6 text-center text-sm text-muted">
            {signUpMode ? t.auth.haveAccount : t.auth.noAccount}{" "}
            <Link
              to={signUpMode ? "/login" : "/register"}
              className="font-semibold text-accent underline-offset-4 hover:underline"
            >
              {signUpMode ? t.auth.signIn : t.auth.signUp}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
