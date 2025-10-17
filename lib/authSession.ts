"use client";

import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

export type AuthListener = (session: Session | null) => void;

let currentSession: Session | null = null;
let hasLoadedInitialSession = false;
let loadingPromise: Promise<Session | null> | null = null;
const listeners = new Set<AuthListener>();

function notify(session: Session | null) {
  listeners.forEach((listener) => {
    try {
      listener(session);
    } catch (listenerError) {
      console.error("Auth listener threw an error", listenerError);
    }
  });
}

function setSession(session: Session | null) {
  currentSession = session ?? null;
  hasLoadedInitialSession = true;
  notify(currentSession);
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
        setSession(session);
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

void supabase.auth.onAuthStateChange((_event, session) => {
  setSession(session ?? null);
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
    if (data.session) {
      setSession(data.session);
    }

    return data.user;
  }

  return null;
}

export function subscribeToAuthChanges(listener: AuthListener) {
  listeners.add(listener);

  if (hasLoadedInitialSession) {
    listener(currentSession);
  }

  return () => {
    listeners.delete(listener);
  };
}
