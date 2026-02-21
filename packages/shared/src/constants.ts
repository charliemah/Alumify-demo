export const CHALLENGE_TYPES = ["solo", "group", "community"] as const;
export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

export const CHALLENGE_STATUS = ["draft", "active", "ended"] as const;
export type ChallengeStatus = (typeof CHALLENGE_STATUS)[number];

export const PARTICIPATION_STATUS = ["active", "completed", "abandoned"] as const;
export type ParticipationStatus = (typeof PARTICIPATION_STATUS)[number];

export const ACHIEVEMENT_CODES = [
  "first_challenge",
  "streak_7",
  "streak_30",
  "team_player",
  "early_adopter",
  "milestone_master",
  "challenge_champion",
] as const;
export type AchievementCode = (typeof ACHIEVEMENT_CODES)[number];

export const DEFAULT_LEVELS: { level: number; xp_threshold: number; rank_name: string }[] = [
  { level: 1, xp_threshold: 0, rank_name: "Rookie" },
  { level: 2, xp_threshold: 100, rank_name: "Contributor" },
  { level: 3, xp_threshold: 500, rank_name: "Rising Star" },
  { level: 4, xp_threshold: 1500, rank_name: "Champion" },
  { level: 5, xp_threshold: 4000, rank_name: "Legend" },
];
