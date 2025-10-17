"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { cacheAuthRedirect, consumeCachedAuthRedirect, getCurrentSession, subscribeToAuthChanges } from "@/lib/authSession";

export type SupabaseAuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
};

const SupabaseAuthContext = createContext<SupabaseAuthContextValue>({
  session: null,
  user: null,
  isLoading: true,
});

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSessionState] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastAuthEvent, setLastAuthEvent] = useState<AuthChangeEvent | "INITIAL_SESSION" | null>(null);

  useEffect(() => {
    let isMounted = true;

    getCurrentSession()
      .then((initialSession) => {
        if (!isMounted) {
          return;
        }

        setSessionState(initialSession);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to initialize Supabase session", error);
        if (isMounted) {
          setSessionState(null);
          setIsLoading(false);
        }
      });

    const unsubscribe = subscribeToAuthChanges((nextSession, event) => {
      if (!isMounted) {
        return;
      }

      setSessionState(nextSession);
      setIsLoading(false);
      setLastAuthEvent(event);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isLoading || !session) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const hash = window.location.hash ?? "";
    const hasOAuthTokens =
      hash.includes("access_token") || hash.includes("refresh_token") || hash.includes("expires_in");

    if (!hasOAuthTokens) {
      return;
    }

    const target = consumeCachedAuthRedirect("/new-trade");
    const cleanUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState({}, document.title, cleanUrl);

    if (pathname !== target) {
      router.push(target);
    }
  }, [isLoading, pathname, router, session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (lastAuthEvent !== "SIGNED_IN") {
      return;
    }

    const target = consumeCachedAuthRedirect("/new-trade");

    if (pathname !== target) {
      router.push(target);
    }

    setLastAuthEvent(null);
  }, [lastAuthEvent, pathname, router, session]);

  useEffect(() => {
    if (isLoading || !session) {
      return;
    }

    const isAuthScreen = pathname?.startsWith("/login") || pathname?.startsWith("/auth/");
    const isSplashScreen = pathname === "/";

    if (!isAuthScreen && !isSplashScreen) {
      return;
    }

    const target = consumeCachedAuthRedirect("/new-trade");

    if (pathname !== target) {
      router.push(target);
    }
  }, [isLoading, pathname, router, session]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
    }),
    [session, isLoading],
  );

  return (
    <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  return useContext(SupabaseAuthContext);
}

export function useRequireAuth(redirectTo: string = "/login") {
  const auth = useSupabaseAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (auth.isLoading) {
      return;
    }

    if (auth.user) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const { search } = window.location;
    const currentPath = search && search.length > 0 ? `${pathname}${search}` : pathname ?? "/";
    cacheAuthRedirect(currentPath);
    const target = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`;
    router.replace(target);
  }, [auth.isLoading, auth.user, pathname, redirectTo, router]);

  return auth;
}
