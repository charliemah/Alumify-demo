"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

interface Entry {
  rank: number;
  user_id: string;
  email: string;
  total_xp: number;
  current_level: number;
  streak_days: number;
  rank_title: string;
  institution_name?: string;
}

export default function LeaderboardsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [scope, setScope] = useState("global");
  const [period, setPeriod] = useState<"all_time" | "weekly">("all_time");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await apiClient.leaderboards.list({ scope, type: "user", period });
        setEntries((res as any).entries ?? []);
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [scope, period]);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/profile" className="text-sm text-slate-400 hover:text-slate-200">
          ← Back to profile
        </Link>
        <h1 className="mt-6 text-2xl font-bold">Leaderboards</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {["global", "institution"].map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
                scope === s ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {s}
            </button>
          ))}
          <span className="mx-2 self-center text-slate-500">|</span>
          {(["all_time", "weekly"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                period === p ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {p === "all_time" ? "All time" : "This week"}
            </button>
          ))}
        </div>
        {loading ? (
          <p className="mt-6 text-slate-400">Loading...</p>
        ) : (
          <div className="mt-6 space-y-3">
            {entries.map((e) => (
              <div
                key={e.user_id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-4"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 font-bold text-slate-300">
                    {e.rank}
                  </span>
                  <div>
                    <p className="font-medium">{e.email}</p>
                    <p className="text-sm text-slate-500">{e.rank_title} · Lvl {e.current_level}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-indigo-400">{e.total_xp} XP</p>
                  {e.streak_days > 0 && (
                    <p className="text-xs text-amber-400">{e.streak_days}d streak</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
