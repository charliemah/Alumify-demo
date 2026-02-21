import { ApiClient } from "@alumify/api-client";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

function setToken(accessToken: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("accessToken", accessToken);
}

export const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  getToken,
  getRefreshToken,
  setToken,
  onUnauthorized: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/login";
  },
});

export { ApiClient };
