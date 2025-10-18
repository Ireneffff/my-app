"use client";

import { useMemo } from "react";
import Button from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";

export default function AuthButton() {
  const { status, user, isAuthenticating, signInWithGitHub, signOut } = useAuth();

  const displayName = useMemo(() => {
    if (!user) {
      return "";
    }

    return (
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.user_metadata?.user_name ||
      user.email ||
      "Account"
    );
  }, [user]);

  if (status === "loading") {
    return (
      <Button variant="ghost" size="sm" disabled className="min-w-[180px] justify-center">
        Checking session...
      </Button>
    );
  }

  if (status === "authenticated" && user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={signOut}
        disabled={isAuthenticating}
        className="min-w-[220px] justify-center"
      >
        {displayName} <span aria-hidden="true">👤</span> | Logout
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={signInWithGitHub}
      disabled={isAuthenticating}
      className="min-w-[180px] justify-center"
    >
      Sign in with GitHub
    </Button>
  );
}
