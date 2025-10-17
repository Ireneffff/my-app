import { Suspense } from "react";

import Card from "@/components/ui/Card";

import LoginPageClient from "./LoginPageClient";

function LoginLoading() {
  return (
    <section className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-16 text-fg">
      <Card className="w-full max-w-md space-y-6 p-8 text-center">
        <h1 className="text-xl font-semibold">Checking your session…</h1>
        <p className="text-sm text-muted-fg">Please wait while we prepare your trading journal.</p>
      </Card>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginPageClient loading={<LoginLoading />} />
    </Suspense>
  );
}
