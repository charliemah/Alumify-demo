// Types
export type { User, Institution, AlumniProfile, Challenge, ChallengeParticipation } from "./types";
export type { Achievement, UserStats, Level } from "./types/gamification";

// Schemas (Zod)
export {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  createChallengeSchema,
  updateChallengeSchema,
  updateProfileSchema,
  joinChallengeSchema,
  progressSchema,
} from "./schemas";

// Constants
export {
  CHALLENGE_TYPES,
  CHALLENGE_STATUS,
  PARTICIPATION_STATUS,
  ACHIEVEMENT_CODES,
  DEFAULT_LEVELS,
} from "./constants";

// Utilities
export { getLevelFromXp, getXpForNextLevel, getRankName, calculateStreakBonus } from "./utils";
