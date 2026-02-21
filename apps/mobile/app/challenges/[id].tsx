import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput } from "react-native";
import { apiClient } from "@/lib/api-client";

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  points: number;
  institution_name?: string;
  participant_count?: number;
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
}

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participation, setParticipation] = useState<Participation | null>(null);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [milestoneNum, setMilestoneNum] = useState(1);
  const [checkInMsg, setCheckInMsg] = useState("");
  const [teams, setTeams] = useState<{ id: string; name: string; member_count: string }[]>([]);
  const [discussions, setDiscussions] = useState<{ id: string; body: string; author_email: string }[]>([]);
  const [newPost, setNewPost] = useState("");

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [chRes, meRes, teamsRes, discRes] = await Promise.all([
          apiClient.challenges.get(id),
          apiClient.challenges.getMe(id).catch(() => ({ participation: null, progress: [] })),
          apiClient.teams.list(id).catch(() => ({ teams: [] })),
          apiClient.discussions.list(id).catch(() => ({ discussions: [] })),
        ]);
        setChallenge((chRes as any).challenge);
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
      await apiClient.challenges.join(id);
      setParticipation({ id: "", status: "active" });
      setProgress([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Join failed");
    } finally {
      setActionLoading("");
    }
  };

  const handleProgress = async () => {
    setActionLoading("progress");
    setError("");
    try {
      await apiClient.challenges.progress(id, { milestone: milestoneNum });
      setProgress((p) => [...p, { milestone: milestoneNum }]);
      const max = challenge?.config?.milestones ?? 5;
      setMilestoneNum(Math.min(milestoneNum + 1, max));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record");
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
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading("");
    }
  };

  const handleJoinTeam = async (teamId: string) => {
    setActionLoading("jointeam");
    setError("");
    try {
      await apiClient.teams.join(id, teamId);
      setParticipation((p) => (p ? { ...p, team_id: teamId } : null));
      setTeams((ts) => ts.map((t) => (t.id === teamId ? { ...t, member_count: String(parseInt(t.member_count, 10) + 1) } : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Join failed");
    } finally {
      setActionLoading("");
    }
  };

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setActionLoading("post");
    setError("");
    try {
      const res = await apiClient.discussions.create(id, { body: newPost.trim() });
      setDiscussions((d) => [(res as any).discussion, ...d]);
      setNewPost("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Post failed");
    } finally {
      setActionLoading("");
    }
  };

  const handleCheckIn = async () => {
    setActionLoading("checkin");
    setError("");
    setCheckInMsg("");
    try {
      const res = (await apiClient.challenges.checkIn(id)) as { streak?: number; xp_earned?: number; message?: string };
      setCheckInMsg(res.message ?? `+${res.xp_earned ?? 5} XP! Streak: ${res.streak ?? 0} days`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setActionLoading("");
    }
  };

  if (loading)
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#818cf8" />
      </View>
    );

  if (!challenge)
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.muted}>Challenge not found</Text>
        <Pressable onPress={() => router.back()} style={styles.linkBtn}>
          <Text style={styles.link}>Go back</Text>
        </Pressable>
      </View>
    );

  const maxMilestones = challenge.config?.milestones ?? 5;
  const completed = progress.length;
  const isCompleted = participation?.status === "completed";
  const hasJoined = !!participation;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.tags}>
        {challenge.institution_name && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{challenge.institution_name}</Text>
          </View>
        )}
        <View style={styles.tag}>
          <Text style={styles.tagText}>{challenge.type}</Text>
        </View>
      </View>

      <Text style={styles.title}>{challenge.title}</Text>
      <Text style={styles.desc}>{challenge.description}</Text>
      <Text style={styles.meta}>
        {challenge.points} XP · Ends {new Date(challenge.end_at).toLocaleDateString()}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {checkInMsg ? <Text style={styles.success}>{checkInMsg}</Text> : null}

      {!hasJoined && (
        <Pressable
          style={[styles.primaryBtn, !!actionLoading && styles.disabled]}
          onPress={handleJoin}
          disabled={!!actionLoading}
        >
          <Text style={styles.primaryBtnText}>
            {actionLoading === "join" ? "Joining..." : "Join challenge"}
          </Text>
        </Pressable>
      )}

      {hasJoined && !isCompleted && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress</Text>
          <Text style={styles.muted}>
            {completed} of {maxMilestones} milestones
          </Text>
          <View style={styles.progressBar}>
            {Array.from({ length: maxMilestones }, (_, i) => (
              <View
                key={i}
                style={[styles.progressSegment, i < completed && styles.progressDone]}
              />
            ))}
          </View>

          <View style={styles.milestoneRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.milestoneScroll}>
              {Array.from({ length: maxMilestones }, (_, i) => (
                <Pressable
                  key={i}
                  style={[styles.milestonePill, milestoneNum === i + 1 && styles.milestonePillActive]}
                  onPress={() => setMilestoneNum(i + 1)}
                >
                  <Text style={[styles.milestonePillText, milestoneNum === i + 1 && styles.milestonePillTextActive]}>
                    M{i + 1}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.primaryBtn, styles.smallBtn, !!actionLoading && styles.disabled]}
              onPress={handleProgress}
              disabled={!!actionLoading}
            >
              <Text style={styles.primaryBtnText}>{actionLoading === "progress" ? "..." : "Submit"}</Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <Pressable
              style={[styles.secondaryBtn, !!actionLoading && styles.disabled]}
              onPress={handleCheckIn}
              disabled={!!actionLoading}
            >
              <Text style={styles.secondaryBtnText}>
                {actionLoading === "checkin" ? "..." : "Daily check-in"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.completeBtn, !!actionLoading && styles.disabled]}
              onPress={handleComplete}
              disabled={!!actionLoading}
            >
              <Text style={styles.completeBtnText}>{actionLoading === "complete" ? "..." : "Mark complete"}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {isCompleted && (
        <View style={styles.completedBox}>
          <Text style={styles.completedText}>Challenge completed. Great work!</Text>
        </View>
      )}

      {hasJoined && (challenge.type === "group" || challenge.type === "community") && teams.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Teams</Text>
          {teams.map((t) => (
            <Pressable
              key={t.id}
              style={styles.teamCard}
              onPress={() => (participation as any)?.team_id !== t.id && handleJoinTeam(t.id)}
              disabled={!!actionLoading}
            >
              <Text style={styles.teamName}>{t.name} ({t.member_count})</Text>
              {(participation as any)?.team_id !== t.id && (
                <Text style={styles.joinLink}>Join</Text>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {hasJoined && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discussion</Text>
          <TextInput
            style={styles.postInput}
            value={newPost}
            onChangeText={setNewPost}
            placeholder="Share a thought..."
            placeholderTextColor="#64748b"
            multiline
          />
          <Pressable
            style={[styles.primaryBtn, styles.smallBtn, (!newPost.trim() || !!actionLoading) && styles.disabled]}
            onPress={handlePost}
            disabled={!newPost.trim() || !!actionLoading}
          >
            <Text style={styles.primaryBtnText}>{actionLoading === "post" ? "..." : "Post"}</Text>
          </Pressable>
          {discussions.map((d) => (
            <View key={d.id} style={styles.discCard}>
              <Text style={styles.discBody}>{d.body}</Text>
              <Text style={styles.discMeta}>{d.author_email}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  content: { padding: 24 },
  center: { justifyContent: "center", alignItems: "center" },
  tags: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tag: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: { color: "#94a3b8", fontSize: 12 },
  title: { fontSize: 24, fontWeight: "bold", color: "#f8fafc", marginTop: 16 },
  desc: { marginTop: 8, color: "#94a3b8" },
  meta: { marginTop: 8, color: "#64748b", fontSize: 14 },
  error: { marginTop: 16, color: "#f87171" },
  success: { marginTop: 16, color: "#34d399" },
  muted: { color: "#94a3b8", marginTop: 4 },
  link: { color: "#818cf8" },
  linkBtn: { marginTop: 16 },
  primaryBtn: {
    marginTop: 24,
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "600" },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#475569",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#f8fafc", fontWeight: "600" },
  completeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  completeBtnText: { color: "#34d399", fontWeight: "600" },
  disabled: { opacity: 0.6 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#f8fafc" },
  progressBar: { flexDirection: "row", gap: 4, marginTop: 8 },
  progressSegment: { flex: 1, height: 8, backgroundColor: "#334155", borderRadius: 4 },
  progressDone: { backgroundColor: "#4f46e5" },
  milestoneRow: { marginTop: 16, gap: 12 },
  milestoneScroll: { flexDirection: "row", marginBottom: 12 },
  milestonePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#1e293b",
    marginRight: 8,
  },
  milestonePillActive: { backgroundColor: "#4f46e5" },
  milestonePillText: { color: "#94a3b8", fontWeight: "600" },
  milestonePillTextActive: { color: "#fff" },
  smallBtn: { marginTop: 0 },
  row: { flexDirection: "row", gap: 12, marginTop: 16 },
  completedBox: {
    marginTop: 24,
    backgroundColor: "#064e3b",
    padding: 16,
    borderRadius: 8,
  },
  completedText: { color: "#34d399", fontWeight: "600" },
  teamCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  teamName: { color: "#f8fafc" },
  joinLink: { color: "#818cf8", fontSize: 14 },
  postInput: {
    marginTop: 8,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    padding: 12,
    color: "#f8fafc",
    minHeight: 60,
  },
  discCard: {
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  discBody: { color: "#f8fafc" },
  discMeta: { fontSize: 12, color: "#64748b", marginTop: 4 },
});
