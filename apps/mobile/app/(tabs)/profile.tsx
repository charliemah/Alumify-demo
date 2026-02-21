import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { requestNotificationPermission, getPushToken } from "@/lib/notifications";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import * as SecureStore from "expo-secure-store";
import { apiClient } from "@/lib/api-client";

interface Profile {
  id: string;
  institution_id?: string;
  grad_year?: number;
  degree?: string;
  bio?: string;
}

interface Stats {
  total_xp: number;
  current_level: number;
  streak_days: number;
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
}

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editForm, setEditForm] = useState({ institution_id: "", grad_year: "", degree: "", bio: "" });

  const { data: profData, isLoading: profLoading, error: profError } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await apiClient.profiles.getMe();
      return (res as any).profile as Profile | null;
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await apiClient.stats.getMe();
      return { stats: (res as any).stats, achievements: (res as any).achievements ?? [] };
    },
  });
  const achievements = (statsData as any)?.achievements ?? [];
  const stats = (statsData as any)?.stats as Stats | null;

  const { data: instData } = useQuery({
    queryKey: ["institutions"],
    queryFn: async () => {
      const res = await apiClient.institutions.list();
      return (res as any).institutions as Institution[];
    },
  });

  const { data: prefsData } = useQuery({
    queryKey: ["preferences"],
    queryFn: async () => {
      const res = await apiClient.preferences.get();
      return (res as any).preferences as { notify_streak_risk?: boolean; notify_milestone_near?: boolean };
    },
  });

  const prefsUpdateMutation = useMutation({
    mutationFn: (body: { notify_streak_risk?: boolean; notify_milestone_near?: boolean }) =>
      apiClient.preferences.update(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["preferences"] }),
  });

  const prefs = {
    notify_streak_risk: prefsData?.notify_streak_risk ?? true,
    notify_milestone_near: prefsData?.notify_milestone_near ?? true,
  };

  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await apiClient.profiles.update(body);
      return (res as any).profile;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  const profile = profData ?? null;
  const institutions = instData ?? [];

  useEffect(() => {
    if (profile) {
      setEditForm({
        institution_id: profile.institution_id ?? "",
        grad_year: profile.grad_year ? String(profile.grad_year) : "",
        degree: profile.degree ?? "",
        bio: profile.bio ?? "",
      });
    }
  }, [profile?.id]);

  const handleSave = () => {
    const body: Record<string, unknown> = {
      degree: editForm.degree || undefined,
      bio: editForm.bio || undefined,
      institution_id: editForm.institution_id ? editForm.institution_id : null,
    };
    if (editForm.grad_year) body.grad_year = parseInt(editForm.grad_year, 10);
    updateMutation.mutate(body);
  };

  const handleSignOut = async () => {
    try {
      const rt = await SecureStore.getItemAsync("refreshToken");
      if (rt) await apiClient.auth.logout(rt);
    } catch {
      /* continue */
    }
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    router.replace("/(auth)/login");
  };

  if (profError && profError instanceof Error && profError.message.includes("Unauthorized")) {
    router.replace("/(auth)/login");
    return null;
  }

  if (profLoading)
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#818cf8" />
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        {stats && (
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.total_xp}</Text>
              <Text style={styles.statLabel}>XP</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.current_level}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.streak_days}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.rank_title}</Text>
              <Text style={styles.statLabel}>Rank</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Edit profile</Text>

        <Text style={styles.label}>Institution</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.instScroll}>
          <Pressable
            style={[styles.instChip, !editForm.institution_id && styles.instChipActive]}
            onPress={() => setEditForm((f) => ({ ...f, institution_id: "" }))}
          >
            <Text style={[styles.instChipText, !editForm.institution_id && styles.instChipTextActive]}>
              None
            </Text>
          </Pressable>
          {institutions.map((i) => (
            <Pressable
              key={i.id}
              style={[styles.instChip, editForm.institution_id === i.id && styles.instChipActive]}
              onPress={() => setEditForm((f) => ({ ...f, institution_id: i.id }))}
            >
              <Text style={[styles.instChipText, editForm.institution_id === i.id && styles.instChipTextActive]}>
                {i.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Graduation year</Text>
        <TextInput
          style={styles.input}
          value={editForm.grad_year}
          onChangeText={(t) => setEditForm((f) => ({ ...f, grad_year: t.replace(/\D/g, "").slice(0, 4) }))}
          placeholder="e.g. 2020"
          placeholderTextColor="#64748b"
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Degree</Text>
        <TextInput
          style={styles.input}
          value={editForm.degree}
          onChangeText={(t) => setEditForm((f) => ({ ...f, degree: t }))}
          placeholder="e.g. B.S. Computer Science"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={editForm.bio}
          onChangeText={(t) => setEditForm((f) => ({ ...f, bio: t }))}
          placeholder="Tell us about yourself..."
          placeholderTextColor="#64748b"
          multiline
        />

        <Pressable
          style={[styles.saveBtn, updateMutation.isPending && styles.disabled]}
          onPress={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save changes</Text>
          )}
        </Pressable>

        {achievements.length > 0 && (
          <View style={styles.achievementsSection}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            {achievements.map((a: Achievement) => (
              <View key={a.code} style={styles.achCard}>
                <Text style={styles.achName}>{a.name}</Text>
                <Text style={styles.achDesc}>{a.description}</Text>
                <Text style={styles.achMeta}>+{a.xp_reward} XP</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Notifications</Text>
        <Text style={styles.prefsSubtitle}>Choose what nudges you receive</Text>
        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>Streak at risk</Text>
          <Switch
            value={prefs.notify_streak_risk}
            onValueChange={(v) => {
              prefsUpdateMutation.mutate({ notify_streak_risk: v });
            }}
            trackColor={{ false: "#334155", true: "#4f46e5" }}
            thumbColor="#f8fafc"
          />
        </View>
        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>Milestone near</Text>
          <Switch
            value={prefs.notify_milestone_near}
            onValueChange={(v) => {
              prefsUpdateMutation.mutate({ notify_milestone_near: v });
            }}
            trackColor={{ false: "#334155", true: "#4f46e5" }}
            thumbColor="#f8fafc"
          />
        </View>

        <Pressable
          style={styles.notifyBtn}
          onPress={async () => {
            const ok = await requestNotificationPermission();
            if (!ok) {
              alert("Notifications denied");
              return;
            }
            const token = await getPushToken();
            if (token) {
              try {
                await apiClient.pushToken.register(token);
                alert("Notifications enabled");
              } catch {
                alert("Failed to register for notifications");
              }
            } else {
              alert("Could not get push token");
            }
          }}
        >
          <Text style={styles.notifyBtnText}>Enable notifications</Text>
        </Pressable>

        <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  content: { padding: 24 },
  center: { justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", color: "#f8fafc" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 20,
  },
  statBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
  },
  statValue: { fontSize: 24, fontWeight: "bold", color: "#818cf8" },
  statLabel: { marginTop: 4, color: "#94a3b8", fontSize: 12 },
  sectionTitle: { marginTop: 24, fontSize: 18, fontWeight: "600", color: "#f8fafc" },
  label: { marginTop: 16, color: "#94a3b8", fontSize: 14 },
  input: {
    marginTop: 8,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    padding: 14,
    color: "#f8fafc",
  },
  textArea: { minHeight: 80 },
  instScroll: { flexDirection: "row", marginTop: 8 },
  instChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#1e293b",
    marginRight: 8,
  },
  instChipActive: { backgroundColor: "#4f46e5" },
  instChipText: { color: "#94a3b8" },
  instChipTextActive: { color: "#fff" },
  saveBtn: {
    marginTop: 24,
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "600" },
  notifyBtn: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 8,
  },
  notifyBtnText: { color: "#94a3b8" },
  signOutBtn: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutText: { color: "#94a3b8" },
  disabled: { opacity: 0.6 },
  prefsSubtitle: { marginTop: 4, color: "#94a3b8", fontSize: 14 },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#1e293b",
    borderRadius: 8,
  },
  prefLabel: { color: "#f8fafc", fontSize: 16 },
  achievementsSection: { marginTop: 24 },
  achCard: {
    backgroundColor: "#1e293b",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  achName: { color: "#fbbf24", fontWeight: "600" },
  achDesc: { color: "#94a3b8", fontSize: 14, marginTop: 2 },
  achMeta: { color: "#64748b", fontSize: 12, marginTop: 4 },
});
