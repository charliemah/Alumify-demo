"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

interface Nudge {
  type: string;
  message: string;
  priority: number;
}

export function NudgeBanner() {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !localStorage.getItem("accessToken")) return;
    apiClient.nudges.list().then((res) => {
      setNudges((res as any).nudges ?? []);
    }).catch(() => setNudges([]));
  }, []);

  if (dismissed || nudges.length === 0) return null;

  const top = nudges[0];
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <p className="text-sm text-amber-200">{top.message}</p>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-400 hover:text-amber-300"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
