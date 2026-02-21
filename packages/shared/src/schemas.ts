import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token required"),
});

export const updateProfileSchema = z.object({
  institution_id: z.string().uuid().optional().nullable(),
  grad_year: z.number().int().min(1900).max(2100).optional(),
  degree: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  avatar_url: z.string().url().optional().nullable(),
});

export const createChallengeSchema = z.object({
  institution_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  type: z.enum(["solo", "group", "community"]),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  points: z.number().int().min(0),
  config: z.record(z.unknown()).optional(),
});

export const updateChallengeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  type: z.enum(["solo", "group", "community"]).optional(),
  start_at: z.string().datetime().optional(),
  end_at: z.string().datetime().optional(),
  points: z.number().int().min(0).optional(),
  status: z.enum(["draft", "active", "ended"]).optional(),
  config: z.record(z.unknown()).optional(),
});

export const joinChallengeSchema = z.object({
  team_id: z.string().uuid().optional(),
  invite_code: z.string().min(1).max(32).optional(),
});

export const progressSchema = z.object({
  milestone: z.number().int().min(1).optional(),
  completed: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
});

export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
});

export const createDiscussionSchema = z.object({
  body: z.string().min(1).max(5000),
  parent_id: z.string().uuid().optional(),
  team_id: z.string().uuid().optional(),
});
