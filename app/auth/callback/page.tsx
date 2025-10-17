import { Suspense } from "react";

import Card from "@/components/ui/Card";

import AuthCallbackClient from "./AuthCallbackClient";

function AuthCallbackLoading() {
  return (
    <section className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-16 text-fg">
      <Card className="w-full max-w-md space-y-6 p-8 text-center">
        <h1 className="text-xl font-semibold">Finishing sign-in…</h1>
        <p className="text-sm text-muted-fg">
          We&apos;re completing your GitHub login and preparing your trades.
        </p>
      </Card>
    </section>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackLoading />}>
      <AuthCallbackClient loading={<AuthCallbackLoading />} />
    </Suspense>
  );
}
