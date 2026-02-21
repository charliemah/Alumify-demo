"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Invalid verification link.");
      return;
    }
    apiClient.auth
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Invalid or expired link.");
      });
  }, [token]);

  if (status === "pending") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
          <h1 className="text-2xl font-bold">Verifying your email...</h1>
          <p className="mt-2 text-slate-400">Please wait.</p>
        </div>
      </main>
    );
  }

  if (status === "success") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
          <h1 className="text-2xl font-bold text-green-400">Email verified</h1>
          <p className="text-slate-400">Your email has been verified. You can now use all features.</p>
          <Link
            href="/challenges"
            className="inline-block rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white transition hover:bg-indigo-500"
          >
            Go to challenges
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
        <h1 className="text-2xl font-bold">Verification failed</h1>
        <p className="text-slate-400">{error}</p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white transition hover:bg-indigo-500"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
