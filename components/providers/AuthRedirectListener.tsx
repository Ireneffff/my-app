"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { consumeCachedAuthRedirect, clearCachedAuthRedirect } from "@/lib/authSession";

function hasOAuthTokensInHash() {
  if (typeof window === "undefined") {
    return false;
  }

  const hash = window.location.hash ?? "";

  if (hash.length === 0) {
    return false;
  }

  return (
    hash.includes("access_token") ||
    hash.includes("refresh_token") ||
    hash.includes("expires_in")
  );
}

function cleanOAuthHash() {
  if (typeof window === "undefined") {
    return;
  }

  if (!hasOAuthTokensInHash()) {
    return;
  }

  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState({}, document.title, cleanUrl);
}

function shouldRedirect(pathname: string | null) {
  if (!pathname || pathname === "/") {
    return true;
  }

  if (pathname === "/login") {
    return true;
  }

  if (pathname.startsWith("/auth/")) {
    return true;
  }

  return false;
}

function redirectToTarget(router: ReturnType<typeof useRouter>, pathname: string | null) {
  const target = consumeCachedAuthRedirect("/new-trade");

  if (pathname === target) {
    return;
  }

  router.push(target);
}

function handleSession(
  router: ReturnType<typeof useRouter>,
  pathname: string | null,
  session: Session | null,
) {
  if (!session) {
    return;
  }

  if (!shouldRedirect(pathname)) {
    return;
  }

  cleanOAuthHash();
  redirectToTarget(router, pathname);
}

export default function AuthRedirectListener() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;

    const checkInitialSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("Failed to retrieve Supabase session for redirect", error.message ?? error);
        return;
      }

      handleSession(router, pathname, data?.session ?? null);
    };

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session) => {
        if (!isMounted) {
          return;
        }

        if (event === "SIGNED_IN") {
          handleSession(router, pathname, session ?? null);
          return;
        }

        if (event === "SIGNED_OUT") {
          clearCachedAuthRedirect();
        }
      },
    );

    void checkInitialSession();

    return () => {
      isMounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
