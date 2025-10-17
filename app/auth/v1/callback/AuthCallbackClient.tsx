"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useSupabaseAuth } from "@/components/providers/SupabaseAuthProvider";
import { cacheAuthRedirect } from "@/lib/authSession";

interface AuthCallbackClientProps {
  loading: ReactNode;
}

function buildRedirectTarget(path: string) {
  if (!path || path === "" || path === "undefined") {
    return "/";
  }

  if (path.startsWith("/")) {
    return path;
  }

  try {
    const url = new URL(path, typeof window === "undefined" ? undefined : window.location.origin);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch (error) {
    console.error("Invalid redirect path provided to Supabase OAuth callback", { path, error });
    return "/";
  }
}

export default function AuthCallbackClient({ loading }: AuthCallbackClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useSupabaseAuth();
  const [hasNavigated, setHasNavigated] = useState(false);

  const redirectParam = searchParams?.get("redirect") ?? "/";
  const error = searchParams?.get("error");
  const errorDescription = searchParams?.get("error_description");

  const redirectTarget = useMemo(() => buildRedirectTarget(redirectParam), [redirectParam]);

  useEffect(() => {
    cacheAuthRedirect(redirectTarget);
  }, [redirectTarget]);

  useEffect(() => {
    if (error || errorDescription) {
      console.error("Supabase OAuth callback returned an error", {
        error,
        errorDescription,
      });
    }
  }, [error, errorDescription]);

  useEffect(() => {
    if (hasNavigated) {
      return;
    }

    if (isLoading) {
      return;
    }

    if (user) {
      setHasNavigated(true);
      router.replace(redirectTarget);
      return;
    }

    const loginTarget = `/login?redirect=${encodeURIComponent(redirectTarget)}`;

    const timeout = window.setTimeout(() => {
      if (!hasNavigated) {
        console.error("Supabase OAuth callback did not yield a session. Redirecting to login.");
        setHasNavigated(true);
        router.replace(loginTarget);
      }
    }, 5000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [hasNavigated, isLoading, redirectTarget, router, user]);

  if (hasNavigated) {
    return null;
  }

  return <>{loading}</>;
}
