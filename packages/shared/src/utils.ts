import { DEFAULT_LEVELS } from "./constants";

export function getLevelFromXp(xp: number): number {
  let level = 1;
  for (const l of DEFAULT_LEVELS) {
    if (xp >= l.xp_threshold) level = l.level;
  }
  return level;
}

export function getXpForNextLevel(currentXp: number): { needed: number; total: number } {
  const level = getLevelFromXp(currentXp);
  const next = DEFAULT_LEVELS.find((l) => l.level === level + 1);
  if (!next) return { needed: 0, total: 0 };
  const needed = next.xp_threshold - currentXp;
  return { needed, total: next.xp_threshold };
}

export function getRankName(xp: number): string {
  const level = getLevelFromXp(xp);
  const l = DEFAULT_LEVELS.find((x) => x.level === level);
  return l?.rank_name ?? "Rookie";
}

export function calculateStreakBonus(streakDays: number): number {
  if (streakDays < 7) return 0;
  if (streakDays >= 30) return 50;
  if (streakDays >= 14) return 25;
  return 10;
}
