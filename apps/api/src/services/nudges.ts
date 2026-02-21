import type { Pool } from "pg";
import { getXpForNextLevel } from "@alumify/shared";

export interface Nudge {
  type: string;
  message: string;
  priority: number;
}

export async function computeNudges(db: Pool, userId: string): Promise<Nudge[]> {
  const nudges: Nudge[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const { rows: prefs } = await db.query(
    "SELECT notify_streak_risk, notify_milestone_near FROM user_preferences WHERE user_id = $1",
    [userId]
  );
  const notifyStreak = prefs[0]?.notify_streak_risk ?? true;
  const notifyMilestone = prefs[0]?.notify_milestone_near ?? true;

  const { rows: stats } = await db.query(
    "SELECT total_xp, streak_days, last_activity_at FROM user_stats WHERE user_id = $1",
    [userId]
  );
  const statsRow = stats[0];

  if (statsRow && notifyStreak) {
    const streak = statsRow.streak_days ?? 0;
    const lastAt = statsRow.last_activity_at ? new Date(statsRow.last_activity_at) : null;
    if (lastAt && streak >= 1) {
      const lastDay = new Date(lastAt.getFullYear(), lastAt.getMonth(), lastAt.getDate());
      const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays === 1) {
        nudges.push({
          type: "streak_risk",
          message: `Don't lose your ${streak}-day streak! Check in today.`,
          priority: 1,
        });
      }
    }
  }

  if (statsRow && notifyMilestone) {
    const { needed } = getXpForNextLevel(statsRow.total_xp ?? 0);
    if (needed > 0 && needed <= 25) {
      nudges.push({
        type: "milestone_near",
        message: `You're ${needed} XP away from your next level. Almost there!`,
        priority: 2,
      });
    }
  }

  const { rows: activeChallenges } = await db.query(
    `SELECT c.id, c.title, c.end_at FROM challenges c
     JOIN challenge_participations cp ON c.id = cp.challenge_id
     WHERE cp.user_id = $1 AND cp.status = 'active' AND c.status = 'active'`,
    [userId]
  );
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  for (const ch of activeChallenges) {
    const endAt = new Date(ch.end_at);
    if (endAt <= twoDaysFromNow && endAt > now) {
      const daysLeft = Math.ceil((endAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      nudges.push({
        type: "challenge_expiring",
        message: `"${ch.title}" ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Finish strong!`,
        priority: 2,
      });
    }
  }

  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const { rows: teammateRows } = await db.query(
    `SELECT c.title FROM team_members tm
     JOIN team_members tm2 ON tm.team_id = tm2.team_id AND tm2.user_id != $1
     JOIN user_stats us ON tm2.user_id = us.user_id AND us.last_activity_at > $2
     JOIN teams t ON tm.team_id = t.id
     JOIN challenges c ON t.challenge_id = c.id AND c.status = 'active'
     WHERE tm.user_id = $1
     LIMIT 1`,
    [userId, dayAgo]
  );
  if (teammateRows.length > 0) {
    nudges.push({
      type: "teammate_activity",
      message: `A teammate made progress on "${teammateRows[0].title}". Keep up the momentum!`,
      priority: 3,
    });
  }

  nudges.sort((a, b) => a.priority - b.priority);
  return nudges;
}
