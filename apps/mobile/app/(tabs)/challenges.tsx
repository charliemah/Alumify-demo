import { useQuery } from "@tanstack/react-query";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { Link } from "expo-router";
import { apiClient } from "@/lib/api-client";
import { NudgeBanner } from "@/components/NudgeBanner";

export default function ChallengesScreen() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      const res = await apiClient.challenges.list();
      return res.challenges as { id: string; title: string; description?: string }[];
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading challenges...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error instanceof Error ? error.message : "Failed to load"}</Text>
      </View>
    );
  }

  const challenges = data ?? [];

  return (
    <View style={styles.container}>
      <NudgeBanner />
      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.muted}>No challenges yet. Check back soon!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Link href={`/challenges/${item.id}` as never} asChild>
            <Pressable style={styles.card}>
              <View style={styles.cardTags}>
                {(item as any).institution_name && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{(item as any).institution_name}</Text>
                  </View>
                )}
                {(item as any).type && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{(item as any).type}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.description ? (
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, gap: 12 },
  empty: { padding: 24, alignItems: "center" },
  muted: { color: "#94a3b8" },
  error: { color: "#f87171" },
  card: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTags: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 8 },
  tag: {
    backgroundColor: "#334155",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tagText: { color: "#94a3b8", fontSize: 12 },
  cardTitle: { color: "#f8fafc", fontWeight: "600" },
  cardDesc: { marginTop: 4, color: "#94a3b8", fontSize: 14 },
});
