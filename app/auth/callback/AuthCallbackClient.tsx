"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useSupabaseAuth } from "@/components/providers/SupabaseAuthProvider";
import { cacheAuthRedirect } from "@/lib/authSession";
import { supabase } from "@/lib/supabaseClient";

interface AuthCallbackClientProps {
  loading: ReactNode;
}

function buildRedirectTarget(path: string) {
  if (!path || path === "" || path === "undefined") {
    return "/new-trade";
  }

  if (path.startsWith("/")) {
    return path;
  }

  try {
    const url = new URL(path, typeof window === "undefined" ? undefined : window.location.origin);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch (error) {
    console.error("Invalid redirect path provided to Supabase OAuth callback", { path, error });
    return "/new-trade";
  }
}

function buildLoginTarget(redirectTarget: string) {
  return `/login?redirect=${encodeURIComponent(redirectTarget)}`;
}

function getHashParams(): URLSearchParams {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  const { hash } = window.location;
  if (!hash) {
    return new URLSearchParams();
  }

  const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(fragment);
}

function cleanOAuthHash() {
  if (typeof window === "undefined") {
    return;
  }

  if (!window.location.hash) {
    return;
  }

  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState({}, document.title, cleanUrl);
}

export default function AuthCallbackClient({ loading }: AuthCallbackClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useSupabaseAuth();
  const [hasNavigated, setHasNavigated] = useState(false);

  const redirectParam = searchParams?.get("redirect") ?? "/new-trade";
  const queryError = searchParams?.get("error");
  const queryErrorDescription = searchParams?.get("error_description");
  const code = searchParams?.get("code");

  const redirectTarget = useMemo(() => buildRedirectTarget(redirectParam), [redirectParam]);

  useEffect(() => {
    cacheAuthRedirect(redirectTarget);
  }, [redirectTarget]);

  useEffect(() => {
    if (queryError || queryErrorDescription) {
      console.error("Supabase OAuth callback returned an error", {
        error: queryError,
        errorDescription: queryErrorDescription,
      });
    }
  }, [queryError, queryErrorDescription]);

  useEffect(() => {
    if (hasNavigated) {
      return;
    }

    if (isAuthLoading) {
      return;
    }

    const finalizeAuth = async () => {
      const loginTarget = buildLoginTarget(redirectTarget);

      if (user) {
        setHasNavigated(true);
        router.replace(redirectTarget);
        return;
      }

      const hashParams = getHashParams();

      const hashError = hashParams.get("error");
      const hashErrorDescription = hashParams.get("error_description");
      if (hashError || hashErrorDescription) {
        console.error("Supabase OAuth hash contained an error", {
          error: hashError,
          errorDescription: hashErrorDescription,
        });
        setHasNavigated(true);
        router.replace(loginTarget);
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error("Failed to set Supabase session from OAuth callback", {
            message: error.message,
            status: error.status ?? null,
            error,
          });
          setHasNavigated(true);
          router.replace(loginTarget);
          return;
        }

        cleanOAuthHash();
        setHasNavigated(true);
        router.replace(redirectTarget);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("Failed to exchange Supabase OAuth code for session", {
            message: error.message,
            status: error.status ?? null,
            error,
          });
          setHasNavigated(true);
          router.replace(loginTarget);
          return;
        }

        cleanOAuthHash();
        setHasNavigated(true);
        router.replace(redirectTarget);
        return;
      }

      console.error("Supabase OAuth callback did not provide tokens or code. Redirecting to login.");
      setHasNavigated(true);
      router.replace(loginTarget);
    };

    void finalizeAuth();
  }, [code, hasNavigated, isAuthLoading, redirectTarget, router, user]);

  if (hasNavigated) {
    return null;
  }

  return <>{loading}</>;
}
