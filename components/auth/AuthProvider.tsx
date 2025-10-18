"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  status: AuthStatus;
  isAuthenticating: boolean;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const clearOAuthFragments = () => {
      if (typeof window === "undefined") {
        return;
      }

      const hasHashParams = window.location.hash.includes("access_token") || window.location.hash.includes("refresh_token");

      if (!hasHashParams) {
        return;
      }

      const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
      window.history.replaceState({}, document.title, cleanUrl);
    };

    const syncSessionFromUrl = async () => {
      try {
        const currentHash = typeof window !== "undefined" ? window.location.hash : "";
        console.log("[AuthProvider] syncSessionFromUrl: current hash", currentHash);

        const hasOAuthHash =
          typeof window !== "undefined" &&
          window.location.hash.length > 0 &&
          window.location.hash.includes("access_token");

        let hasProcessedExchange = false;

        if (hasOAuthHash) {
          console.log("[AuthProvider] Found OAuth hash fragment, exchanging for session...");
          const {
            data: exchangeData,
            error: exchangeError,
          } = await supabase.auth.exchangeCodeForSession(window.location.hash);

          console.log("[AuthProvider] exchangeCodeForSession response", {
            data: exchangeData,
            error: exchangeError,
          });

          if (!isMounted) {
            return;
          }

          if (exchangeError) {
            console.error(
              "Unable to exchange Supabase session:",
              exchangeError.message,
              exchangeError,
            );
          } else {
            console.log("[AuthProvider] exchangeCodeForSession success", exchangeData);
            const exchangedSession = exchangeData?.session ?? null;
            setSession(exchangedSession);
            setStatus(exchangedSession ? "authenticated" : "unauthenticated");
            clearOAuthFragments();
            hasProcessedExchange = true;
          }
        } else {
          console.log("[AuthProvider] No OAuth hash fragment detected, skipping exchange.");
        }

        const {
          data: { session: activeSession },
          error,
        } = await supabase.auth.getSession();

        console.log("[AuthProvider] getSession result", {
          hasSession: Boolean(activeSession),
          error,
        });

        if (!isMounted) {
          return;
        }

        if (error) {
          console.error("Unable to restore Supabase session:", error.message);
          setSession(null);
          setStatus("unauthenticated");
          return;
        }

        if (activeSession) {
          setSession(activeSession);
          setStatus("authenticated");
        } else if (!hasProcessedExchange) {
          setSession(null);
          setStatus("unauthenticated");
        }

        if (activeSession) {
          clearOAuthFragments();
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error("Unexpected error while restoring Supabase session:", error);
        setSession(null);
        setStatus("unauthenticated");
      }
    };

    void syncSessionFromUrl();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) {
        return;
      }

      setSession(newSession);
      setStatus(newSession ? "authenticated" : "unauthenticated");
      setIsAuthenticating(false);

      if (newSession && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")) {
        clearOAuthFragments();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGitHub = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    setIsAuthenticating(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("GitHub sign-in failed:", error);
      setIsAuthenticating(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsAuthenticating(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error while signing out:", error);
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      status,
      isAuthenticating,
      signInWithGitHub,
      signOut,
    }),
    [session, status, isAuthenticating, signInWithGitHub, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
