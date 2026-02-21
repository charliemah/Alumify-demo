import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { apiClient } from "@/lib/api-client";

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!token) {
      setError("Invalid reset link. Request a new one.");
      return;
    }
    setLoading(true);
    try {
      await apiClient.auth.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired link");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: "#4ade80" }]}>Password reset</Text>
        <Text style={styles.subtitle}>Your password has been updated. You can now sign in.</Text>
        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Sign in</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  if (!token) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Invalid link</Text>
        <Text style={styles.subtitle}>This reset link is invalid or expired. Request a new one.</Text>
        <Link href="/(auth)/forgot-password" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Request reset link</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set new password</Text>
      <Text style={styles.subtitle}>Choose a new password for your account</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput
        style={styles.input}
        placeholder="New password (min 8 characters)"
        placeholderTextColor="#64748b"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm password"
        placeholderTextColor="#64748b"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        editable={!loading}
      />
      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Reset password</Text>
        )}
      </Pressable>
      <Link href="/(auth)/login" asChild>
        <Pressable>
          <Text style={styles.link}>Back to sign in</Text>
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
  input: {
    marginTop: 16,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    padding: 14,
    color: "#f8fafc",
  },
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
