import { useEffect, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { getPushTokenIfGranted } from "@/lib/notifications";
import { apiClient } from "@/lib/api-client";

export default function TabLayout() {
  const router = useRouter();
  const [guarding, setGuarding] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync("accessToken").then((token) => {
      setGuarding(false);
      if (!token) router.replace("/(auth)/login");
    });
  }, [router]);

  useEffect(() => {
    if (guarding) return;
    getPushTokenIfGranted().then((token) => {
      if (token) apiClient.pushToken.register(token).catch(() => {});
    });
  }, [guarding]);

  if (guarding) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: "#0f172a", borderTopColor: "#334155" },
        tabBarActiveTintColor: "#818cf8",
        tabBarInactiveTintColor: "#64748b",
      }}
    >
      <Tabs.Screen name="challenges" options={{ title: "Challenges" }} />
      <Tabs.Screen name="leaderboards" options={{ title: "Leaderboards" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
