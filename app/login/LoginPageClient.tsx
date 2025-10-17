"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode, type SVGProps } from "react";

import { useSupabaseAuth } from "@/components/providers/SupabaseAuthProvider";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabaseClient";

interface LoginPageClientProps {
  loading: ReactNode;
}

function GitHubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill="currentColor"
        d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.2c-3.35.73-4.06-1.62-4.06-1.62-.55-1.4-1.35-1.77-1.35-1.77-1.1-.75.08-.74.08-.74 1.22.09 1.86 1.26 1.86 1.26 1.08 1.86 2.84 1.32 3.53 1 .11-.8.42-1.33.76-1.63-2.67-.31-5.48-1.34-5.48-5.95 0-1.32.47-2.4 1.25-3.25-.13-.31-.54-1.57.12-3.27 0 0 1-.32 3.3 1.24a11.4 11.4 0 0 1 6 0c2.28-1.56 3.28-1.24 3.28-1.24.67 1.7.26 2.96.13 3.27.78.85 1.25 1.93 1.25 3.25 0 4.62-2.82 5.63-5.5 5.94.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .5Z"
      />
    </svg>
  );
}

export default function LoginPageClient({ loading }: LoginPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useSupabaseAuth();
  const redirectTo = searchParams?.get("redirect") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGitHubRedirecting, setIsGitHubRedirecting] = useState(false);

  const isBusy = useMemo(() => isSubmitting || isGitHubRedirecting, [isSubmitting, isGitHubRedirecting]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (user) {
      router.replace(redirectTo);
    }
  }, [isAuthLoading, redirectTo, router, user]);

  if (isAuthLoading || user) {
    return <>{loading}</>;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message ?? "Unable to sign in");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    router.replace(redirectTo);
  };

  const handleGitHubSignIn = async () => {
    if (isBusy) {
      return;
    }

    setErrorMessage(null);
    setIsGitHubRedirecting(true);

    try {
      const redirectUrl =
        typeof window === "undefined"
          ? null
          : `${window.location.origin}/login?redirect=${encodeURIComponent(redirectTo)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: redirectUrl ? { redirectTo: redirectUrl } : undefined,
      });

      if (error) {
        setErrorMessage(error.message ?? "Unable to sign in with GitHub");
        setIsGitHubRedirecting(false);
      }
    } catch (error) {
      console.error("GitHub sign-in failed", error);
      setErrorMessage("Unable to sign in with GitHub. Please try again.");
      setIsGitHubRedirecting(false);
    }
  };

  return (
    <section className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-16 text-fg">
      <Card className="w-full max-w-md space-y-6 p-8">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-muted-fg">
            Access your trading journal from any device by signing in with your Supabase account.
          </p>
        </header>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-muted-fg" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent"
            autoComplete="email"
          />

          <label className="mt-4 block text-sm font-medium text-muted-fg" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent"
            autoComplete="current-password"
          />

          {errorMessage ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {errorMessage}
            </p>
          ) : null}

          <Button type="submit" variant="primary" size="md" className="w-full" disabled={isBusy}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-surface px-3 text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="md"
          className="w-full"
          onClick={handleGitHubSignIn}
          disabled={isBusy}
          leftIcon={<GitHubIcon className="h-5 w-5" />}
        >
          {isGitHubRedirecting ? "Redirecting…" : "Sign in with GitHub"}
        </Button>

        <p className="text-center text-xs text-muted-fg">
          Having trouble? Contact support or
          <Link href="https://app.supabase.com" target="_blank" className="ml-1 underline">
            reset your password
          </Link>
          .
        </p>
      </Card>
    </section>
  );
}
