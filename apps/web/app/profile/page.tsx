"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

interface Profile {
  id: string;
  user_id: string;
  institution_id?: string;
  grad_year?: number;
  degree?: string;
  bio?: string;
  avatar_url?: string;
  institution?: { name: string; slug: string };
}

interface Stats {
  total_xp: number;
  current_level: number;
  streak_days: number;
  last_activity_at: string | null;
  rank_title: string;
}

interface Achievement {
  code: string;
  name: string;
  description: string;
  xp_reward: number;
  earned_at: string;
}

interface Institution {
  id: string;
  name: string;
  slug: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editForm, setEditForm] = useState({
    institution_id: "" as string,
    grad_year: "" as string,
    degree: "",
    bio: "",
  });
  const [prefs, setPrefs] = useState({ notify_streak_risk: true, notify_milestone_near: true });
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [authRes, profRes, statsRes, instRes, prefsRes] = await Promise.all([
          apiClient.auth.me().catch(() => ({ user: null })),
          apiClient.profiles.getMe(),
          apiClient.stats.getMe().catch(() => ({ stats: null, achievements: [] })),
          apiClient.institutions.list(),
          apiClient.preferences.get().catch(() => ({ preferences: {} })),
        ]);
        const user = (authRes as any)?.user;
        setEmailVerified(user?.email_verified_at ? true : (user ? false : null));
        const p = (profRes as any).profile as Profile | null;
        setProfile(p);
        setStats((statsRes as any).stats ?? null);
        setAchievements((statsRes as any).achievements ?? []);
        setInstitutions((instRes as any).institutions ?? []);
        const prefsData = (prefsRes as any).preferences as { notify_streak_risk?: boolean; notify_milestone_near?: boolean };
        setPrefs({
          notify_streak_risk: prefsData?.notify_streak_risk ?? true,
          notify_milestone_near: prefsData?.notify_milestone_near ?? true,
        });
        if (p) {
          setEditForm({
            institution_id: p.institution_id ?? "",
            grad_year: p.grad_year ? String(p.grad_year) : "",
            degree: p.degree ?? "",
            bio: p.bio ?? "",
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
        if (err instanceof Error && err.message.includes("Unauthorized")) {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        degree: editForm.degree || undefined,
        bio: editForm.bio || undefined,
      };
      body.institution_id = editForm.institution_id ? editForm.institution_id : null;
      if (editForm.grad_year)
        body.grad_year = parseInt(editForm.grad_year, 10);
      const res = await apiClient.profiles.update(body);
      setProfile((res as any).profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="text-slate-400">Loading profile...</div>
      </main>
    );

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Profile</h1>

        {emailVerified === false && (
          <div className="mt-6 rounded-xl border border-amber-800 bg-amber-900/20 p-4">
            <p className="text-amber-200">Your email is not verified. Check your inbox for the verification link.</p>
            <button
              type="button"
              disabled={resendLoading}
              onClick={async () => {
                setResendLoading(true);
                try {
                  await apiClient.auth.resendVerification();
                  alert("Verification email sent. Check your inbox.");
                  setEmailVerified(null);
                } catch {
                  alert("Failed to send. Try again later.");
                } finally {
                  setResendLoading(false);
                }
              }}
              className="mt-3 text-sm font-medium text-amber-400 hover:text-amber-300 disabled:opacity-50"
            >
              {resendLoading ? "Sending..." : "Resend verification email"}
            </button>
          </div>
        )}

        {stats && (
          <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-slate-300">Your stats</h2>
              <Link href="/leaderboards" className="text-sm text-indigo-400 hover:text-indigo-300">View leaderboards</Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-slate-800/50 p-4">
                <p className="text-2xl font-bold text-indigo-400">{stats.total_xp}</p>
                <p className="text-sm text-slate-400">XP</p>
              </div>
              <div className="rounded-lg bg-slate-800/50 p-4">
                <p className="text-2xl font-bold">{stats.current_level}</p>
                <p className="text-sm text-slate-400">Level</p>
              </div>
              <div className="rounded-lg bg-slate-800/50 p-4">
                <p className="text-2xl font-bold text-amber-400">{stats.streak_days}</p>
                <p className="text-sm text-slate-400">Day streak</p>
              </div>
              <div className="rounded-lg bg-slate-800/50 p-4">
                <p className="text-2xl font-bold text-slate-200">{stats.rank_title}</p>
                <p className="text-sm text-slate-400">Rank</p>
              </div>
            </div>
          </section>
        )}

        {achievements.length > 0 && (
          <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="font-medium text-slate-300">Achievements</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {achievements.map((a) => (
                <div key={a.code} className="rounded-lg bg-slate-800/50 p-3">
                  <p className="font-medium text-amber-400">{a.name}</p>
                  <p className="mt-0.5 text-sm text-slate-400">{a.description}</p>
                  <p className="mt-1 text-xs text-slate-500">+{a.xp_reward} XP · {new Date(a.earned_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="font-medium text-slate-300">Edit profile</h2>
          {error && (
            <div className="mt-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400">Institution</label>
              <select
                value={editForm.institution_id}
                onChange={(e) => setEditForm((f) => ({ ...f, institution_id: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100"
              >
                <option value="">None</option>
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400">Graduation year</label>
              <input
                type="number"
                value={editForm.grad_year}
                onChange={(e) => setEditForm((f) => ({ ...f, grad_year: e.target.value }))}
                min={1900}
                max={2100}
                placeholder="e.g. 2020"
                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400">Degree</label>
              <input
                type="text"
                value={editForm.degree}
                onChange={(e) => setEditForm((f) => ({ ...f, degree: e.target.value }))}
                placeholder="e.g. B.S. Computer Science"
                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400">Bio</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                rows={3}
                placeholder="Tell us about yourself..."
                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 placeholder-slate-500"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-slate-100">Notifications</h2>
          <p className="mt-1 text-sm text-slate-400">Choose what nudges you receive</p>
          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={prefs.notify_streak_risk}
                onChange={async (e) => {
                  const v = e.target.checked;
                  setPrefs((p) => ({ ...p, notify_streak_risk: v }));
                  setPrefsSaving(true);
                  try {
                    await apiClient.preferences.update({ notify_streak_risk: v });
                  } finally {
                    setPrefsSaving(false);
                  }
                }}
                className="rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-200">Streak at risk</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={prefs.notify_milestone_near}
                onChange={async (e) => {
                  const v = e.target.checked;
                  setPrefs((p) => ({ ...p, notify_milestone_near: v }));
                  setPrefsSaving(true);
                  try {
                    await apiClient.preferences.update({ notify_milestone_near: v });
                  } finally {
                    setPrefsSaving(false);
                  }
                }}
                className="rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-200">Milestone near</span>
            </label>
            {prefsSaving && <span className="text-xs text-slate-500">Saving...</span>}
          </div>
        </section>
      </div>
    </main>
  );
}
