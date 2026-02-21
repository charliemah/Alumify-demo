import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
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
    apiClient.nudges
      .list()
      .then((res) => setNudges((res as any).nudges ?? []))
      .catch(() => setNudges([]));
  }, []);

  if (dismissed || nudges.length === 0) return null;

  const top = nudges[0];
  return (
    <Pressable style={styles.banner} onPress={() => setDismissed(true)}>
      <Text style={styles.text}>{top.message}</Text>
      <Text style={styles.dismiss}>×</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  text: { flex: 1, color: "#fcd34d", fontSize: 14 },
  dismiss: { color: "#fcd34d", fontSize: 20, marginLeft: 8 },
});
