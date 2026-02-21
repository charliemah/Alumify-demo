import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Alumify</h1>
        <p className="mt-4 text-lg text-slate-400">
          The first challenge-based alumni engagement app for collaborative lifelong learning
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-500"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-slate-600 px-6 py-3 font-medium transition hover:border-slate-500 hover:bg-slate-800/50"
          >
            Get Started
          </Link>
        </div>
      </div>
    </main>
  );
}
