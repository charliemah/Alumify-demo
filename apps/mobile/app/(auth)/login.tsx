import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Link, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { apiClient } from "@/lib/api-client";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const { accessToken, refreshToken } = await apiClient.auth.login({ email, password });
      await SecureStore.setItemAsync("accessToken", accessToken);
      await SecureStore.setItemAsync("refreshToken", refreshToken);
      router.replace("/(tabs)/challenges");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in to Alumify</Text>
      <Text style={styles.subtitle}>Enter your credentials</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput
        style={[styles.input, styles.inputFirst]}
        placeholder="Email"
        placeholderTextColor="#64748b"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      <View style={styles.passwordRow}>
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
        <Link href="/(auth)/forgot-password" asChild>
          <Pressable style={styles.forgotLink}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
        </Link>
      </View>
      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </Pressable>
      <Link href="/(auth)/register" asChild>
        <Pressable>
          <Text style={styles.link}>Don&apos;t have an account? Sign up</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 24,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#f8fafc" },
  subtitle: { marginTop: 4, color: "#94a3b8" },
  error: { marginTop: 16, color: "#f87171" },
  passwordRow: { marginTop: 16 },
  input: {
    marginTop: 0,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    padding: 14,
    color: "#f8fafc",
  },
  inputFirst: { marginTop: 16 },
  forgotLink: { marginTop: 8, alignSelf: "flex-end" },
  forgotText: { color: "#818cf8", fontSize: 14 },
  button: {
    marginTop: 24,
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "600" },
  link: { marginTop: 16, color: "#818cf8", textAlign: "center" },
});
