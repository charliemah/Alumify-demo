"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";

export function Header() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(typeof window !== "undefined" && !!localStorage.getItem("accessToken"));
  }, [pathname]);

  const handleSignOut = async () => {
    const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
    try {
      await apiClient.auth.logout(refreshToken ?? undefined);
    } catch {
      // Continue with local signout anyway
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setIsLoggedIn(false);
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-bold text-slate-100 hover:text-white">
          Alumify
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/leaderboards"
            className={`text-sm font-medium transition ${
              pathname === "/leaderboards" ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Leaderboards
          </Link>
          <Link
            href="/challenges"
            className={`text-sm font-medium transition ${
              pathname?.startsWith("/challenges")
                ? "text-indigo-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Challenges
          </Link>
          {isLoggedIn ? (
            <>
              <Link
                href="/profile"
                className={`text-sm font-medium transition ${
                  pathname === "/profile" ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm font-medium text-slate-400 hover:text-slate-200"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium text-slate-400 hover:text-slate-200"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
