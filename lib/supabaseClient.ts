"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isBrowser = typeof window !== "undefined";

const missingConfig = !supabaseUrl || !supabaseAnonKey;

if (missingConfig && isBrowser) {
  console.warn(
    "Supabase client could not be initialised: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.",
  );
}

export const supabase: SupabaseClient | null = missingConfig || !isBrowser
  ? null
  : createClient(supabaseUrl, supabaseAnonKey);