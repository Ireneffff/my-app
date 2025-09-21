import Link from "next/link";

export default function Home() {
  return (
    <section className="mx-auto flex min-h-dvh max-w-screen-sm flex-col items-center justify-center px-5">
      <div className="w-full rounded-2xl border border-border/60 bg-bg/90 p-6 shadow-xl shadow-black/10">
        <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
          Trading Journal
        </h1>
        <p className="mt-3 text-lg text-muted-fg">Calm mind, strong trade</p>

        <div className="mt-10">
          <Link
            href="/new-trade"
            className="inline-flex items-center gap-3 rounded-xl border border-border bg-bg px-5 py-3 text-lg font-medium shadow-md shadow-black/10 transition hover:translate-y-px hover:shadow-lg"
          >
            <span className="text-xl">+</span>
            <span>Register a trade</span>
          </Link>
        </div>
      </div>
    </section>
  );
}