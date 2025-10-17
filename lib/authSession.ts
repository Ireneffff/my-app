"use client";

import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

export type AuthListener = (
  session: Session | null,
  event: AuthChangeEvent | "INITIAL_SESSION",
) => void;

let currentSession: Session | null = null;
let hasLoadedInitialSession = false;
let loadingPromise: Promise<Session | null> | null = null;
const listeners = new Set<AuthListener>();
const AUTH_REDIRECT_STORAGE_KEY = "supabase.auth.redirect";

function notify(session: Session | null, event: AuthChangeEvent | "INITIAL_SESSION") {
  listeners.forEach((listener) => {
    try {
      listener(session, event);
    } catch (listenerError) {
      console.error("Auth listener threw an error", listenerError);
    }
  });
}

function setSession(
  session: Session | null,
  event: AuthChangeEvent | "INITIAL_SESSION" = "INITIAL_SESSION",
) {
  currentSession = session ?? null;
  hasLoadedInitialSession = true;
  notify(currentSession, event);
}

async function loadInitialSession() {
  if (hasLoadedInitialSession) {
    return currentSession;
  }

  if (!loadingPromise) {
    loadingPromise = supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to retrieve Supabase session", error.message ?? error);
        }

        const session = data?.session ?? null;
        setSession(session, "INITIAL_SESSION");
        return session;
      })
      .finally(() => {
        loadingPromise = null;
      });
  }

  return loadingPromise;
}

if (typeof window !== "undefined") {
  void loadInitialSession();
}

void supabase.auth.onAuthStateChange((event, session) => {
  setSession(session ?? null, event);
});

export async function getCurrentSession(): Promise<Session | null> {
  if (hasLoadedInitialSession) {
    return currentSession;
  }

  return loadInitialSession();
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getCurrentSession();
  if (session?.user) {
    return session.user;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Failed to retrieve Supabase user", error.message ?? error);
    return null;
  }

  if (data?.user) {
    if (!currentSession || currentSession.user?.id !== data.user.id) {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error(
          "Failed to refresh Supabase session after retrieving user",
          sessionError.message ?? sessionError,
        );
      } else {
        setSession(sessionData?.session ?? null);
      }
    }

    return data.user;
  }

  return null;
}

export function subscribeToAuthChanges(listener: AuthListener) {
  listeners.add(listener);

  if (hasLoadedInitialSession) {
    listener(currentSession, "INITIAL_SESSION");
  }

  return () => {
    listeners.delete(listener);
  };
}

function sanitizeRedirectTarget(target: string | null | undefined): string | null {
  if (!target || target === "undefined" || target === "null") {
    return null;
  }

  if (target.startsWith("/")) {
    return target;
  }

  try {
    const url = new URL(target, "https://example.com");
    const normalized = `${url.pathname}${url.search}${url.hash}`;
    return normalized || "/new-trade";
  } catch (error) {
    console.error("Invalid redirect target provided for Supabase auth", { target, error });
    return null;
  }
}

export function cacheAuthRedirect(target: string | null | undefined) {
  if (typeof window === "undefined") {
    return;
  }

  const sanitized = sanitizeRedirectTarget(target);

  if (sanitized) {
    window.sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, sanitized);
  } else {
    window.sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
  }
}

export function getCachedAuthRedirect(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY);
  const sanitized = sanitizeRedirectTarget(stored);

  if (!sanitized) {
    return null;
  }

  return sanitized;
}

export function clearCachedAuthRedirect() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
}

export function consumeCachedAuthRedirect(fallback: string = "/new-trade") {
  const target = getCachedAuthRedirect();
  clearCachedAuthRedirect();
  return target ?? fallback;
}
