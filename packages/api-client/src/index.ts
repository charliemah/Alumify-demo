import { z } from "zod";
import { registerSchema, loginSchema } from "@alumify/shared";

type RegisterBody = z.infer<typeof registerSchema>;
type LoginBody = z.infer<typeof loginSchema>;

const defaultBaseUrl = typeof window !== "undefined" ? "" : "http://localhost:3001";

export interface ApiClientConfig {
  baseUrl?: string;
  getToken?: () => string | null | Promise<string | null>;
  getRefreshToken?: () => string | null | Promise<string | null>;
  setToken?: (accessToken: string) => void;
  onUnauthorized?: () => void;
}

export class ApiClient {
  private baseUrl: string;
  private getToken: () => string | null | Promise<string | null>;
  private getRefreshToken?: () => string | null | Promise<string | null>;
  private setToken?: (accessToken: string) => void;
  private onUnauthorized?: () => void;
  private refreshing = false;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? defaultBaseUrl;
    this.getToken = config.getToken ?? (() => null);
    this.getRefreshToken = config.getRefreshToken;
    this.setToken = config.setToken;
    this.onUnauthorized = config.onUnauthorized;
  }

  private async request<T>(
    path: string,
    options: RequestInit & { params?: Record<string, string> } = {},
    isRetry = false
  ): Promise<T> {
    const { params, ...init } = options;
    const url = new URL(path.startsWith("http") ? path : `${this.baseUrl}/api/v1${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const token = await Promise.resolve(this.getToken?.() ?? null);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string>),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url.toString(), { ...init, headers });
    if (res.status === 401) {
      const canRefresh =
        !isRetry &&
        this.getRefreshToken &&
        this.setToken &&
        !path.includes("/auth/refresh") &&
        !this.refreshing;
      if (canRefresh) {
        const refreshToken = await Promise.resolve(this.getRefreshToken!());
        if (refreshToken) {
          this.refreshing = true;
          try {
            const { accessToken } = await this.auth.refresh(refreshToken);
            this.setToken!(accessToken);
            this.refreshing = false;
            return this.request<T>(path, options, true);
          } catch {
            this.refreshing = false;
          }
        }
      }
      if (this.onUnauthorized) this.onUnauthorized();
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message ?? "Request failed");
    }
    if (res.status === 204) return {} as T;
    return res.json() as Promise<T>;
  }

  auth = {
    register: (body: RegisterBody) =>
      this.request<{ user: unknown; accessToken: string; refreshToken: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    login: (body: LoginBody) =>
      this.request<{ user: unknown; accessToken: string; refreshToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    refresh: (refreshToken: string) =>
      this.request<{ accessToken: string }>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }),
    logout: (refreshToken?: string) =>
      this.request<void>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: refreshToken ?? null }),
      }),
    me: () => this.request<{ user: unknown; profile: unknown }>("/auth/me"),
    forgotPassword: (email: string) =>
      this.request<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, password: string) =>
      this.request<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      }),
    verifyEmail: (token: string) =>
      this.request<{ message: string }>("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
    resendVerification: () =>
      this.request<{ message: string }>("/auth/resend-verification", { method: "POST" }),
  };

  institutions = {
    list: (params?: { search?: string; limit?: number }) =>
      this.request<{ institutions: unknown[] }>("/institutions", {
        params: params as Record<string, string>,
      }),
    get: (id: string) => this.request<{ institution: unknown }>(`/institutions/${id}`),
  };

  challenges = {
    list: (params?: { institution_id?: string; status?: string; type?: string; search?: string; limit?: number; offset?: number }) =>
      this.request<{ challenges: unknown[] }>("/challenges", {
        params: params as Record<string, string>,
      }),
    get: (id: string) => this.request<{ challenge: unknown }>(`/challenges/${id}`),
    getMe: (id: string) =>
      this.request<{ participation: unknown; progress: unknown[] }>(`/challenges/${id}/me`),
    create: (body: {
      institution_id?: string | null;
      title: string;
      description: string;
      type: "solo" | "group" | "community";
      start_at: string;
      end_at: string;
      points?: number;
      config?: Record<string, unknown>;
    }) =>
      this.request<{ challenge: unknown }>("/challenges", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    join: (id: string, body?: { team_id?: string; invite_code?: string }) =>
      this.request<{ participation: unknown }>(`/challenges/${id}/join`, {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      }),
    createInvite: (id: string) =>
      this.request<{ code: string; expires_at: string }>(`/challenges/${id}/invite`, {
        method: "POST",
      }),
    progress: (id: string, body: { milestone?: number; completed?: boolean; notes?: string }) =>
      this.request<{ progress: unknown }>(`/challenges/${id}/progress`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    checkIn: (id: string) =>
      this.request<{ streak: number }>(`/challenges/${id}/check-in`, { method: "POST" }),
  };

  profiles = {
    getMe: () => this.request<{ profile: unknown }>("/profiles/me"),
    update: (body: Record<string, unknown>) =>
      this.request<{ profile: unknown }>("/profiles/me", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  };

  stats = {
    getMe: () => this.request<{ stats: unknown; achievements: unknown[] }>("/me/stats"),
    achievements: () => this.request<{ achievements: unknown[] }>("/me/achievements"),
  };

  nudges = {
    list: () => this.request<{ nudges: unknown[] }>("/me/nudges"),
  };

  pushToken = {
    register: (token: string) =>
      this.request<void>("/me/push-token", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
  };

  preferences = {
    get: () => this.request<{ preferences: unknown }>("/me/preferences"),
    update: (body: { notify_streak_risk?: boolean; notify_milestone_near?: boolean }) =>
      this.request<{ preferences: unknown }>("/me/preferences", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  };

  teams = {
    list: (challengeId: string) =>
      this.request<{ teams: unknown[] }>(`/challenges/${challengeId}/teams`),
    create: (challengeId: string, body: { name: string }) =>
      this.request<{ team: unknown }>(`/challenges/${challengeId}/teams`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    join: (challengeId: string, teamId: string) =>
      this.request<{ team: unknown }>(`/challenges/${challengeId}/teams/${teamId}/join`, {
        method: "POST",
      }),
  };

  discussions = {
    list: (challengeId: string, params?: { team_id?: string }) =>
      this.request<{ discussions: unknown[] }>(`/challenges/${challengeId}/discussions`, {
        params: params as Record<string, string>,
      }),
    create: (challengeId: string, body: { body: string; parent_id?: string; team_id?: string }) =>
      this.request<{ discussion: unknown }>(`/challenges/${challengeId}/discussions`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  };

  leaderboards = {
    list: (params?: { scope?: string; type?: string; period?: "all_time" | "weekly" }) =>
      this.request<{ entries: unknown[] }>("/leaderboards", {
        params: params as Record<string, string>,
      }),
  };
}

export type { RegisterBody, LoginBody };
