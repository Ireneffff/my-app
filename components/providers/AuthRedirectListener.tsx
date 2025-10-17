"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useSupabaseAuth } from "./SupabaseAuthProvider";
import { clearCachedAuthRedirect, consumeCachedAuthRedirect } from "@/lib/authSession";

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

  router.replace(target);
}

export default function AuthRedirectListener() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, isLoading } = useSupabaseAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!session) {
      return;
    }

    if (!shouldRedirect(pathname)) {
      return;
    }

    redirectToTarget(router, pathname);
  }, [isLoading, pathname, router, session]);

  useEffect(() => {
    if (session) {
      return;
    }

    clearCachedAuthRedirect();
  }, [session]);

  return null;
}
