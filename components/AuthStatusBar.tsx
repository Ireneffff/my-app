"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  useSupabaseAuth,
  type SupabaseAuthContextValue,
} from "@/components/providers/SupabaseAuthProvider";
import Button from "@/components/ui/Button";
import { cacheAuthRedirect } from "@/lib/authSession";
import { supabase } from "@/lib/supabaseClient";

function getDisplayName(user: SupabaseAuthContextValue["user"]) {
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata ?? {};
  return (
    metadata.full_name ||
    metadata.user_name ||
    metadata.preferred_username ||
    metadata.name ||
    user.email ||
    user.phone ||
    null
  );
}

export default function AuthStatusBar() {
  const router = useRouter();
  const { user, isLoading } = useSupabaseAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const displayName = useMemo(() => getDisplayName(user), [user]);

  const handleSignIn = async () => {
    if (isProcessing) {
      return;
    }

    if (typeof window === "undefined") {
      console.error("GitHub sign-in is only available in the browser");
      return;
    }

    setIsProcessing(true);

    try {
      cacheAuthRedirect("/new-trade");
      const redirectTo = `${window.location.origin}/new-trade`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo },
      });

      if (error) {
        console.error("GitHub sign-in failed", {
          message: error.message,
          status: error.status ?? null,
          error,
        });
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("GitHub sign-in failed", error);
      setIsProcessing(false);
    }
  };

  const handleSignOut = async () => {
    if (isProcessing) {
      return;
    }

    setIsProcessing(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Failed to sign out", {
        message: error.message,
        status: error.status ?? null,
        error,
      });
    }

    setIsProcessing(false);
    router.replace("/login");
  };

  return (
    <div className="flex items-center gap-3 text-sm">
      {isLoading ? (
        <span className="text-muted-fg">Checking session…</span>
      ) : user ? (
        <>
          <span className="text-muted-fg">
            Signed in as <span className="font-semibold text-fg">{displayName ?? "Account"}</span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            disabled={isProcessing}
          >
            {isProcessing ? "Signing out…" : "Logout"}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSignIn}
          disabled={isProcessing}
        >
          {isProcessing ? "Connecting…" : "Sign in with GitHub"}
        </Button>
      )}
    </div>
  );
}
