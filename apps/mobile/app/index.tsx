import { useEffect, useState } from "react";
import { Link, useRouter } from "expo-router";
import { View, Text, StyleSheet, Pressable } from "react-native";
import * as SecureStore from "expo-secure-store";

export default function HomeScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync("accessToken").then((token) => {
      setChecking(false);
      if (token) router.replace("/(tabs)/challenges");
    });
  }, [router]);

  if (checking) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.muted}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alumify</Text>
      <Text style={styles.subtitle}>
        The first challenge-based alumni engagement app for collaborative lifelong learning
      </Text>
      <View style={styles.buttons}>
        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </Pressable>
        </Link>
        <Link href="/(auth)/register" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Get Started</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#f8fafc",
  },
  subtitle: {
    marginTop: 16,
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
  },
  buttons: {
    marginTop: 40,
    gap: 12,
    width: "100%",
    maxWidth: 320,
  },
  primaryButton: {
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#475569",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#f8fafc",
    fontWeight: "600",
  },
  center: { justifyContent: "center" as const },
  muted: { color: "#94a3b8" },
});
