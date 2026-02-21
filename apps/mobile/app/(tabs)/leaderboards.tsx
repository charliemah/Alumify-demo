import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { apiClient } from "@/lib/api-client";

export default function LeaderboardsScreen() {
  const [scope, setScope] = useState<"global" | "institution">("global");
  const [period, setPeriod] = useState<"all_time" | "weekly">("all_time");

  const { data, isLoading, error } = useQuery({
    queryKey: ["leaderboards", scope, period],
    queryFn: async () => {
      const res = await apiClient.leaderboards.list({ scope, type: "user", period });
      return (res as { entries: unknown[] }).entries ?? [];
    },
  });

  const entries = (data ?? []) as { rank: number; user_id: string; email: string; total_xp: number; current_level: number; streak_days: number; rank_title: string }[];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboards</Text>
      <View style={styles.filters}>
        {(["global", "institution"] as const).map((s) => (
          <Pressable
            key={s}
            style={[styles.filterBtn, scope === s && styles.filterBtnActive]}
            onPress={() => setScope(s)}
          >
            <Text style={[styles.filterText, scope === s && styles.filterTextActive]}>{s}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.filters}>
        {(["all_time", "weekly"] as const).map((p) => (
          <Pressable
            key={p}
            style={[styles.filterBtn, period === p && styles.filterBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.filterText, period === p && styles.filterTextActive]}>
              {p === "all_time" ? "All time" : "Weekly"}
            </Text>
          </Pressable>
        ))}
      </View>
      {isLoading ? (
        <Text style={styles.muted}>Loading...</Text>
      ) : error ? (
        <Text style={styles.error}>{error instanceof Error ? error.message : "Failed to load"}</Text>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{item.rank}</Text>
                </View>
                <View>
                  <Text style={styles.email}>{item.email}</Text>
                  <Text style={styles.meta}>{item.rank_title} · Lvl {item.current_level}</Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.xp}>{item.total_xp} XP</Text>
                {item.streak_days > 0 && (
                  <Text style={styles.streak}>{item.streak_days}d streak</Text>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", color: "#f8fafc", marginBottom: 16 },
  filters: { flexDirection: "row", gap: 8, marginBottom: 12 },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1e293b",
  },
  filterBtnActive: { backgroundColor: "#4338ca" },
  filterText: { color: "#94a3b8", fontSize: 14 },
  filterTextActive: { color: "#fff" },
  list: { paddingBottom: 24, gap: 12 },
  muted: { color: "#94a3b8", marginTop: 24 },
  error: { color: "#f87171", marginTop: 24 },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 16,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: { color: "#94a3b8", fontWeight: "bold" },
  email: { color: "#f8fafc", fontWeight: "500" },
  meta: { color: "#64748b", fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: "flex-end" },
  xp: { color: "#818cf8", fontWeight: "bold" },
  streak: { color: "#fbbf24", fontSize: 12, marginTop: 2 },
});
