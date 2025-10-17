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
import type { Session, User } from "@supabase/supabase-js";
import { cacheAuthRedirect, getCurrentSession, subscribeToAuthChanges } from "@/lib/authSession";

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
  const [session, setSessionState] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

    const unsubscribe = subscribeToAuthChanges((nextSession) => {
      if (!isMounted) {
        return;
      }

      setSessionState(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

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
