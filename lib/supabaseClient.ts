"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function createFallbackClient(): SupabaseClient {
  const response = {
    data: null,
    error: new Error("Supabase client is not configured."),
  } as const;

  const builderHandler: ProxyHandler<object> = {
    get(_, property) {
      if (property === "select") {
        return () => new Proxy({}, builderHandler);
      }
      if (property === "order") {
        return () => Promise.resolve(response);
      }
      return () => new Proxy({}, builderHandler);
    },
  };

  const clientHandler: ProxyHandler<object> = {
    get(_, property) {
      if (property === "from") {
        return () => new Proxy({}, builderHandler);
      }
      return () => Promise.resolve(response);
    },
  };

  return new Proxy({}, clientHandler) as SupabaseClient;
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createFallbackClient();
