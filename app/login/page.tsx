"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseAuth } from "@/components/providers/SupabaseAuthProvider";

function LoginLoading() {
  return (
    <section className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-16 text-fg">
      <Card className="w-full max-w-md space-y-6 p-8 text-center">
        <h1 className="text-xl font-semibold">Checking your session…</h1>
        <p className="text-sm text-muted-fg">Please wait while we prepare your trading journal.</p>
      </Card>
    </section>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useSupabaseAuth();
  const redirectTo = searchParams?.get("redirect") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (user) {
      router.replace(redirectTo);
    }
  }, [isAuthLoading, redirectTo, router, user]);

  if (isAuthLoading || user) {
    return <LoginLoading />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
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

          <Button type="submit" variant="primary" size="md" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

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

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}
