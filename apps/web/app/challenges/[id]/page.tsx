"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { NudgeBanner } from "@/components/NudgeBanner";

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  points: number;
  institution_name?: string;
  participant_count?: number;
  start_at: string;
  end_at: string;
  config?: { milestones?: number; xp_per_milestone?: number };
  status: string;
}

interface Participation {
  id: string;
  status: string;
  team_id?: string;
}

interface ProgressItem {
  milestone: number;
  completed_at: string;
}

export default function ChallengeDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const inviteCode = searchParams?.get("invite") ?? undefined;

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [participation, setParticipation] = useState<Participation | null>(null);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [milestoneNum, setMilestoneNum] = useState(1);
  const [checkInMessage, setCheckInMessage] = useState("");
  const [teams, setTeams] = useState<{ id: string; name: string; member_count: string }[]>([]);
  const [discussions, setDiscussions] = useState<{ id: string; body: string; author_email: string; created_at: string; replies: unknown[] }[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [newDiscussionBody, setNewDiscussionBody] = useState("");

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [challengeRes, meRes, teamsRes, discRes] = await Promise.all([
          apiClient.challenges.get(id),
          apiClient.challenges.getMe(id).catch(() => ({ participation: null, progress: [] })),
          apiClient.teams.list(id).catch(() => ({ teams: [] })),
          apiClient.discussions.list(id).catch(() => ({ discussions: [] })),
        ]);
        setChallenge(challengeRes.challenge as Challenge);
        setParticipation((meRes as any).participation ?? null);
        setProgress((meRes as any).progress ?? []);
        setTeams((teamsRes as any).teams ?? []);
        setDiscussions((discRes as any).discussions ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleJoin = async () => {
    setActionLoading("join");
    setError("");
    try {
      await apiClient.challenges.join(id, inviteCode ? { invite_code: inviteCode } : undefined);
      setParticipation({ id: "", status: "active" });
      setProgress([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Join failed");
    } finally {
      setActionLoading("");
    }
  };

  const handleCreateInvite = async () => {
    setActionLoading("invite");
    setError("");
    try {
      const res = await apiClient.challenges.createInvite(id);
      const url = typeof window !== "undefined" ? `${window.location.origin}/challenges/${id}?invite=${res.code}` : "";
      setInviteLink(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setActionLoading("");
    }
  };

  const handleProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading("progress");
    setError("");
    try {
      await apiClient.challenges.progress(id, { milestone: milestoneNum });
      setProgress((p) => [...p, { milestone: milestoneNum, completed_at: new Date().toISOString() }]);
      const maxMilestone = challenge?.config?.milestones ?? 5;
      setMilestoneNum(Math.min(milestoneNum + 1, maxMilestone));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record progress");
    } finally {
      setActionLoading("");
    }
  };

  const handleComplete = async () => {
    setActionLoading("complete");
    setError("");
    try {
      await apiClient.challenges.progress(id, { completed: true });
      setParticipation((p) => (p ? { ...p, status: "completed" } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete");
    } finally {
      setActionLoading("");
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setActionLoading("team");
    setError("");
    try {
      const res = await apiClient.teams.create(id, { name: newTeamName.trim() });
      setTeams((t) => [...t, { id: (res as any).team.id, name: (res as any).team.name, member_count: "1" }]);
      setParticipation((p) => (p ? { ...p, team_id: (res as any).team.id } : null));
      setNewTeamName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create team failed");
    } finally {
      setActionLoading("");
    }
  };

  const handleJoinTeam = async (teamId: string) => {
    setActionLoading("jointeam");
    setError("");
    try {
      await apiClient.teams.join(id, teamId);
      const t = teams.find((x) => x.id === teamId);
      if (t) setTeams((ts) => ts.map((x) => (x.id === teamId ? { ...x, member_count: String(parseInt(x.member_count, 10) + 1) } : x)));
      setParticipation((p) => (p ? { ...p, team_id: teamId } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Join team failed");
    } finally {
      setActionLoading("");
    }
  };

  const handleAddDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscussionBody.trim()) return;
    setActionLoading("disc");
    setError("");
    try {
      const res = await apiClient.discussions.create(id, { body: newDiscussionBody.trim() });
      setDiscussions((d) => [(res as any).discussion, ...d]);
      setNewDiscussionBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Post failed");
    } finally {
      setActionLoading("");
    }
  };

  const handleCheckIn = async () => {
    setActionLoading("checkin");
    setError("");
    setCheckInMessage("");
    try {
      const res = await apiClient.challenges.checkIn(id) as { streak?: number; xp_earned?: number; message?: string };
      setCheckInMessage(
        res.message ?? `+${res.xp_earned ?? 5} XP! Streak: ${res.streak ?? 0} days`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setActionLoading("");
    }
  };

  if (loading)
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="text-slate-400">Loading...</div>
      </main>
    );

  if (!challenge)
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-slate-400">Challenge not found</p>
        <Link href="/challenges" className="text-indigo-400 hover:text-indigo-300">
          Back to challenges
        </Link>
      </main>
    );

  const maxMilestones = challenge.config?.milestones ?? 5;
  const completedMilestones = progress.length;
  const isCompleted = participation?.status === "completed";
  const hasJoined = !!participation;

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/challenges" className="text-sm text-slate-400 hover:text-slate-200">
          ← Back to challenges
        </Link>

        <div className="mt-6">
          <NudgeBanner />
        </div>

        <article className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            {challenge.institution_name && (
              <span className="rounded-full bg-slate-800 px-2 py-0.5">{challenge.institution_name}</span>
            )}
            <span className="rounded-full bg-slate-800 px-2 py-0.5 capitalize">{challenge.type}</span>
            <span>{challenge.participant_count ?? 0} participants</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold">{challenge.title}</h1>
          <p className="mt-2 text-slate-400">{challenge.description}</p>
          <p className="mt-2 text-sm text-slate-500">
            {challenge.points} XP · Ends {new Date(challenge.end_at).toLocaleDateString()}
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>
          )}
          {checkInMessage && (
            <div className="mt-4 rounded-lg bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
              {checkInMessage}
            </div>
          )}

          {!hasJoined && (
            <div className="mt-6">
              <button
                onClick={handleJoin}
                disabled={!!actionLoading}
                className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {actionLoading === "join" ? "Joining..." : "Join challenge"}
              </button>
            </div>
          )}

          {hasJoined && (
            <div className="mt-4 flex flex-wrap gap-2">
              {!isCompleted && (
                <button
                  onClick={handleCreateInvite}
                  disabled={!!actionLoading || !!inviteLink}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {actionLoading === "invite" ? "Creating..." : inviteLink ? "Invite link ready" : "Invite friends (+25 XP)"}
                </button>
              )}
              {inviteLink && (
                <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2">
                  <input
                    readOnly
                    value={inviteLink}
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-300 outline-none"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(inviteLink)}
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
          )}

          {hasJoined && !isCompleted && (
            <div className="mt-6 space-y-6">
              <div className="rounded-lg bg-slate-800/50 p-4">
                <h3 className="font-medium">Progress</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {completedMilestones} of {maxMilestones} milestones
                </p>
                <div className="mt-2 flex gap-2">
                  {Array.from({ length: maxMilestones }, (_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full ${
                        i < completedMilestones ? "bg-indigo-500" : "bg-slate-700"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <form onSubmit={handleProgress} className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300">Record milestone</label>
                  <select
                    value={milestoneNum}
                    onChange={(e) => setMilestoneNum(parseInt(e.target.value, 10))}
                    className="mt-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                  >
                    {Array.from({ length: maxMilestones }, (_, i) => (
                      <option key={i} value={i + 1}>
                       	Milestone {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={!!actionLoading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {actionLoading === "progress" ? "Saving..." : "Submit"}
                </button>
              </form>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleCheckIn}
                  disabled={!!actionLoading}
                  className="rounded-lg border border-slate-600 px-4 py-2 font-medium transition hover:border-slate-500 hover:bg-slate-800/50 disabled:opacity-50"
                >
                  {actionLoading === "checkin" ? "Checking in..." : "Daily check-in"}
                </button>
                <button
                  onClick={handleComplete}
                  disabled={!!actionLoading}
                  className="rounded-lg border border-emerald-600 px-4 py-2 font-medium text-emerald-400 transition hover:bg-emerald-500/10 disabled:opacity-50"
                >
                  {actionLoading === "complete" ? "Completing..." : "Mark complete"}
                </button>
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="mt-6 rounded-lg bg-emerald-500/10 px-4 py-3 text-emerald-400">
              Challenge completed. Great work!
            </div>
          )}

          {hasJoined && (challenge.type === "group" || challenge.type === "community") && (
            <section className="mt-8 space-y-4">
              <h3 className="font-medium text-slate-300">Teams</h3>
              <form onSubmit={handleCreateTeam} className="flex gap-2">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="New team name"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500"
                />
                <button
                  type="submit"
                  disabled={!!actionLoading || !newTeamName.trim()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Create
                </button>
              </form>
              <div className="space-y-2">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3"
                  >
                    <span>{team.name} ({team.member_count} members)</span>
                    {(participation as any)?.team_id !== team.id && (
                      <button
                        onClick={() => handleJoinTeam(team.id)}
                        disabled={!!actionLoading}
                        className="text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                      >
                        Join
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {hasJoined && (
            <section className="mt-8 space-y-4">
              <h3 className="font-medium text-slate-300">Discussion</h3>
              <form onSubmit={handleAddDiscussion} className="space-y-2">
                <textarea
                  value={newDiscussionBody}
                  onChange={(e) => setNewDiscussionBody(e.target.value)}
                  placeholder="Share a thought or question..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500"
                />
                <button
                  type="submit"
                  disabled={!!actionLoading || !newDiscussionBody.trim()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Post
                </button>
              </form>
              <div className="space-y-3">
                {discussions.map((d) => (
                  <div key={d.id} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                    <p className="text-slate-200">{d.body}</p>
                    <p className="mt-1 text-xs text-slate-500">{d.author_email} · {new Date(d.created_at).toLocaleString()}</p>
                    {(d.replies as any[])?.length > 0 && (
                      <div className="mt-3 ml-4 space-y-2 border-l-2 border-slate-700 pl-3">
                        {(d.replies as any[]).map((r: any) => (
                          <div key={r.id}>
                            <p className="text-sm text-slate-300">{r.body}</p>
                            <p className="text-xs text-slate-500">{r.author_email}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </article>
      </div>
    </main>
  );
}
