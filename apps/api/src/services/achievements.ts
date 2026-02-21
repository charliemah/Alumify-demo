import { randomUUID } from "crypto";
import { getLevelFromXp, getRankName } from "@alumify/shared";

export async function checkAndAwardAchievements(
  db: any,
  userId: string,
  context: {
    participationsCount?: number;
    streakDays?: number;
    totalMilestones?: number;
    completedChallengesCount?: number;
    hasTeam?: boolean;
  }
) {
  const { rows: earned } = await db.query(
    "SELECT a.code FROM achievements a JOIN user_achievements ua ON a.id = ua.achievement_id WHERE ua.user_id = $1",
    [userId]
  );
  const earnedCodes = new Set(earned.map((r: any) => r.code));
  const toAward: string[] = [];

  if (context.participationsCount === 1 && !earnedCodes.has("first_challenge")) {
    toAward.push("first_challenge");
  }
  if (context.streakDays !== undefined && context.streakDays >= 30 && !earnedCodes.has("streak_30")) {
    toAward.push("streak_30");
  } else if (context.streakDays !== undefined && context.streakDays >= 7 && !earnedCodes.has("streak_7")) {
    toAward.push("streak_7");
  }
  if (context.hasTeam && !earnedCodes.has("team_player")) {
    toAward.push("team_player");
  }
  if (context.totalMilestones !== undefined && context.totalMilestones >= 10 && !earnedCodes.has("milestone_master")) {
    toAward.push("milestone_master");
  }
  if (context.completedChallengesCount === 1 && !earnedCodes.has("challenge_champion")) {
    toAward.push("challenge_champion");
  }

  let totalXpBonus = 0;
  for (const code of toAward) {
    const { rows } = await db.query("SELECT id, xp_reward FROM achievements WHERE code = $1", [code]);
    const ach = rows[0];
    if (!ach) continue;
    try {
      await db.query(
        "INSERT INTO user_achievements (id, user_id, achievement_id) VALUES ($1, $2, $3)",
        [randomUUID(), userId, ach.id]
      );
      totalXpBonus += ach.xp_reward;
    } catch (e: any) {
      if (e.code !== "23505") throw e;
    }
  }
  if (totalXpBonus > 0) {
    const { rows: stats } = await db.query("SELECT total_xp FROM user_stats WHERE user_id = $1", [userId]);
    const currentXp = stats[0]?.total_xp ?? 0;
    const newXp = currentXp + totalXpBonus;
    await db.query(
      "UPDATE user_stats SET total_xp = $1, current_level = $2, rank_title = $3 WHERE user_id = $4",
      [newXp, getLevelFromXp(newXp), getRankName(newXp), userId]
    );
  }
  return toAward;
}
