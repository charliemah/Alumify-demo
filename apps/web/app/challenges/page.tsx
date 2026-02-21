"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchChallenges() {
      setLoading(true);
      try {
        const res = await apiClient.challenges.list(search.trim() ? { search: search.trim() } : undefined);
        setChallenges(res.challenges ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load challenges");
      } finally {
        setLoading(false);
      }
    }
    const t = setTimeout(fetchChallenges, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="text-slate-400">Loading challenges...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Challenges</h1>
          <p className="mt-1 text-slate-400">Join challenges, complete milestones, and earn XP</p>
          <input
            type="search"
            placeholder="Search challenges..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-4 w-full max-w-md rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        {error && (
          <div className="mb-6 rounded-lg bg-amber-500/10 px-4 py-2 text-amber-400">{error}</div>
        )}
        {challenges.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
            <p className="text-slate-400">No challenges yet. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(challenges as { id: string; title: string; description?: string; institution_name?: string; type?: string }[]).map((c) => (
              <Link
                key={c.id}
                href={`/challenges/${c.id}`}
                className="block rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-slate-600"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                  {c.institution_name && (
                    <span className="rounded-full bg-slate-800 px-2 py-0.5">{c.institution_name}</span>
                  )}
                  {c.type && (
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 capitalize">{c.type}</span>
                  )}
                </div>
                <h2 className="mt-2 font-semibold">{c.title}</h2>
                {c.description && (
                  <p className="mt-1 text-sm text-slate-400 line-clamp-2">{c.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
