import { ApiClient } from "@alumify/api-client";
import * as SecureStore from "expo-secure-store";

export const apiClient = new ApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001",
  getToken: () => SecureStore.getItemAsync("accessToken"),
  getRefreshToken: () => SecureStore.getItemAsync("refreshToken"),
  setToken: (accessToken: string) => SecureStore.setItemAsync("accessToken", accessToken),
  onUnauthorized: () => {
    SecureStore.deleteItemAsync("accessToken");
    SecureStore.deleteItemAsync("refreshToken");
  },
});
