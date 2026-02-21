import type { FastifyInstance, FastifyRequest } from "fastify";
import { createChallengeSchema, updateChallengeSchema, joinChallengeSchema, progressSchema } from "@alumify/shared";
import { getLevelFromXp, getRankName, calculateStreakBonus } from "@alumify/shared";
import { randomUUID } from "crypto";
import { checkAndAwardAchievements } from "../services/achievements.js";

function getUserId(req: FastifyRequest): string | null {
  return (req.user as { sub?: string })?.sub ?? null;
}

async function ensureUserStats(db: any, userId: string) {
  const { rows } = await db.query("SELECT 1 FROM user_stats WHERE user_id = $1", [userId]);
  if (rows.length === 0) {
    await db.query(
      "INSERT INTO user_stats (user_id) VALUES ($1)",
      [userId]
    );
  }
}

export async function challengesRoutes(app: FastifyInstance) {
  const db = app.db;

  app.get("/challenges", async (req, reply) => {
    const q = req.query as { institution_id?: string; status?: string; type?: string; search?: string; limit?: string; offset?: string };
    let sql = `SELECT c.*, i.name as institution_name 
       FROM challenges c 
       LEFT JOIN institutions i ON c.institution_id = i.id 
       WHERE 1=1`;
    const params: unknown[] = [];
    let idx = 1;
    if (q.institution_id) {
      sql += ` AND c.institution_id = $${idx++}`;
      params.push(q.institution_id);
    }
    if (q.status) {
      sql += ` AND c.status = $${idx++}`;
      params.push(q.status);
    }
    if (q.type) {
      sql += ` AND c.type = $${idx++}`;
      params.push(q.type);
    }
    if (q.search?.trim()) {
      sql += ` AND (c.title ILIKE $${idx} OR c.description ILIKE $${idx})`;
      params.push(`%${q.search.trim()}%`);
      idx++;
    }
    sql += ` ORDER BY c.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    const limit = Math.min(parseInt(q.limit ?? "50", 10) || 50, 100);
    const offset = Math.max(parseInt(q.offset ?? "0", 10) || 0, 0);
    params.push(limit, offset);
    try {
      const { rows } = await db.query(sql, params);
      return reply.send({ challenges: rows });
    } catch (err) {
      req.log.error({ err }, "Failed to list challenges");
      return reply.status(500).send({ message: "Failed to load challenges" });
    }
  });

  app.get<{ Params: { id: string } }>("/challenges/:id", async (req, reply) => {
    const { id } = req.params;
    try {
      const { rows } = await db.query(
        "SELECT c.*, i.name as institution_name FROM challenges c LEFT JOIN institutions i ON c.institution_id = i.id WHERE c.id = $1",
        [id]
      );
      const challenge = rows[0];
      if (!challenge) return reply.status(404).send({ message: "Challenge not found" });
      const { rows: partRows } = await db.query(
        "SELECT COUNT(*) as count FROM challenge_participations WHERE challenge_id = $1 AND status = 'active'",
        [id]
      );
      (challenge as { participant_count?: number }).participant_count = parseInt(partRows[0]?.count ?? "0", 10);
      return reply.send({ challenge });
    } catch (err) {
      req.log.error({ err, challengeId: id }, "Failed to get challenge");
      return reply.status(500).send({ message: "Failed to load challenge" });
    }
  });

  app.get<{ Params: { id: string } }>("/challenges/:id/me", { preHandler: [app.optionalAuthenticate] }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) return reply.send({ participation: null, progress: [] });
    const { id } = req.params;
    const { rows: partRows } = await db.query(
      "SELECT * FROM challenge_participations WHERE challenge_id = $1 AND user_id = $2",
      [id, userId]
    );
    const participation = partRows[0] ?? null;
    const { rows: progressRows } = await db.query(
      "SELECT * FROM learning_progress WHERE challenge_id = $1 AND user_id = $2 ORDER BY milestone ASC",
      [id, userId]
    );
    return reply.send({ participation, progress: progressRows });
  });

  app.post("/challenges", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) return reply.status(401).send({ message: "Unauthorized" });

    const parsed = createChallengeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0]?.message ?? "Validation failed" });
    }
    const data = parsed.data;
    const id = randomUUID();
    await db.query(
      `INSERT INTO challenges (id, institution_id, title, description, type, start_at, end_at, points, config, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')`,
      [
        id,
        data.institution_id ?? null,
        data.title,
        data.description,
        data.type,
        data.start_at,
        data.end_at,
        data.points ?? 0,
        JSON.stringify(data.config ?? {}),
      ]
    );
    const { rows } = await db.query(
      "SELECT c.*, i.name as institution_name FROM challenges c LEFT JOIN institutions i ON c.institution_id = i.id WHERE c.id = $1",
      [id]
    );
    return reply.status(201).send({ challenge: rows[0] });
  });

  app.patch<{ Params: { id: string } }>("/challenges/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) return reply.status(401).send({ message: "Unauthorized" });

    const parsed = updateChallengeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0]?.message ?? "Validation failed" });
    }
    const data = parsed.data;
    const { id } = req.params;

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (data.title !== undefined) {
      updates.push(`title = $${idx++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.type !== undefined) {
      updates.push(`type = $${idx++}`);
      values.push(data.type);
    }
    if (data.start_at !== undefined) {
      updates.push(`start_at = $${idx++}`);
      values.push(data.start_at);
    }
    if (data.end_at !== undefined) {
      updates.push(`end_at = $${idx++}`);
      values.push(data.end_at);
    }
    if (data.points !== undefined) {
      updates.push(`points = $${idx++}`);
      values.push(data.points);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(data.status);
    }
    if (data.config !== undefined) {
      updates.push(`config = $${idx++}`);
      values.push(JSON.stringify(data.config));
    }
    if (updates.length === 0) {
      const { rows } = await db.query(
        "SELECT c.*, i.name as institution_name FROM challenges c LEFT JOIN institutions i ON c.institution_id = i.id WHERE c.id = $1",
        [id]
      );
      if (!rows[0]) return reply.status(404).send({ message: "Challenge not found" });
      return reply.send({ challenge: rows[0] });
    }
    updates.push(`updated_at = NOW()`);
    values.push(id);
    const { rowCount } = await db.query(
      `UPDATE challenges SET ${updates.join(", ")} WHERE id = $${idx}`,
      values
    );
    if (rowCount === 0) return reply.status(404).send({ message: "Challenge not found" });
    const { rows } = await db.query(
      "SELECT c.*, i.name as institution_name FROM challenges c LEFT JOIN institutions i ON c.institution_id = i.id WHERE c.id = $1",
      [id]
    );
    return reply.send({ challenge: rows[0] });
  });

  app.post<{ Params: { id: string } }>(
    "/challenges/:id/invite",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);
      if (!userId) return reply.status(401).send({ message: "Unauthorized" });
      const { id } = req.params;
      const { rows: partRows } = await db.query(
        "SELECT 1 FROM challenge_participations WHERE challenge_id = $1 AND user_id = $2",
        [id, userId]
      );
      if (!partRows.length) return reply.status(403).send({ message: "Must be enrolled to invite" });
      const code = randomUUID().replace(/-/g, "").slice(0, 12);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db.query(
        "INSERT INTO invite_codes (id, code, inviter_user_id, challenge_id, bonus_xp, expires_at) VALUES ($1, $2, $3, $4, 25, $5)",
        [randomUUID(), code, userId, id, expiresAt]
      );
      return reply.send({ code, expires_at: expiresAt.toISOString() });
    }
  );

  app.post<{ Params: { id: string }; Body: { team_id?: string; invite_code?: string } }>(
    "/challenges/:id/join",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);
      if (!userId) return reply.status(401).send({ message: "Unauthorized" });

      const parsed = joinChallengeSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return reply.status(400).send({ message: parsed.error.errors[0]?.message ?? "Validation failed" });
      }

      const { id } = req.params;
      const { rows: challengeRows } = await db.query(
        "SELECT id, status, end_at, config FROM challenges WHERE id = $1",
        [id]
      );
      const challenge = challengeRows[0];
      if (!challenge) return reply.status(404).send({ message: "Challenge not found" });
      if (challenge.status !== "active" && challenge.status !== "draft") {
        return reply.status(400).send({ message: "Challenge is not open for participation" });
      }
      if (new Date(challenge.end_at) < new Date()) {
        return reply.status(400).send({ message: "Challenge has ended" });
      }

      if (parsed.data.team_id) {
        const { rows: teamRows } = await db.query(
          "SELECT id FROM teams WHERE id = $1 AND challenge_id = $2",
          [parsed.data.team_id, id]
        );
        if (!teamRows.length) return reply.status(400).send({ message: "Team not found" });
        const { rows: sizeRows } = await db.query(
          "SELECT COUNT(*) as c FROM team_members WHERE team_id = $1",
          [parsed.data.team_id]
        );
        const maxSize = (challenge.config ?? {})?.max_team_size ?? 10;
        if (parseInt(sizeRows[0]?.c ?? "0", 10) >= maxSize) {
          return reply.status(400).send({ message: "Team is full" });
        }
      }

      await ensureUserStats(db, userId);

      try {
        const partId = randomUUID();
        const teamId = parsed.data.team_id ?? null;
        await db.query(
          `INSERT INTO challenge_participations (id, challenge_id, user_id, status, team_id)
           VALUES ($1, $2, $3, 'active', $4)`,
          [partId, id, userId, teamId]
        );
        if (teamId) {
          await db.query(
            "INSERT INTO team_members (id, team_id, user_id, role) VALUES ($1, $2, $3, 'member')",
            [randomUUID(), teamId, userId]
          );
        }
        const { rows: partCount } = await db.query(
          "SELECT COUNT(*) as c FROM challenge_participations WHERE user_id = $1",
          [userId]
        );
        await checkAndAwardAchievements(db, userId, {
          participationsCount: parseInt(partCount[0]?.c ?? "0", 10),
          hasTeam: !!teamId,
        });
        if (parsed.data.invite_code) {
          const { rows: invRows } = await db.query(
            "SELECT inviter_user_id, bonus_xp FROM invite_codes WHERE code = $1 AND challenge_id = $2 AND expires_at > NOW()",
            [parsed.data.invite_code.trim(), id]
          );
          if (invRows[0] && invRows[0].inviter_user_id !== userId) {
            const inviterId = invRows[0].inviter_user_id;
            const bonus = parseInt(invRows[0].bonus_xp ?? "25", 10);
            await ensureUserStats(db, inviterId);
            const { rows: invStats } = await db.query("SELECT total_xp FROM user_stats WHERE user_id = $1", [inviterId]);
            const newXp = (invStats[0]?.total_xp ?? 0) + bonus;
            await db.query(
              `UPDATE user_stats SET total_xp = $1, current_level = $2, rank_title = $3, updated_at = NOW() WHERE user_id = $4`,
              [newXp, getLevelFromXp(newXp), getRankName(newXp), inviterId]
            );
          }
        }
        const { rows } = await db.query(
          "SELECT * FROM challenge_participations WHERE id = $1",
          [partId]
        );
        return reply.status(201).send({ participation: rows[0] });
      } catch (err: any) {
        if (err.code === "23505") {
          return reply.status(409).send({ message: "Already joined this challenge" });
        }
        throw err;
      }
    }
  );

  app.post<{ Params: { id: string }; Body: { milestone?: number; completed?: boolean; notes?: string } }>(
    "/challenges/:id/progress",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);
      if (!userId) return reply.status(401).send({ message: "Unauthorized" });

      const parsed = progressSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return reply.status(400).send({ message: parsed.error.errors[0]?.message ?? "Validation failed" });
      }

      const { id } = req.params;
      const { rows: partRows } = await db.query(
        "SELECT id FROM challenge_participations WHERE challenge_id = $1 AND user_id = $2 AND status = 'active'",
        [id, userId]
      );
      if (!partRows.length) return reply.status(403).send({ message: "Not enrolled in this challenge" });

      const { rows: challengeRows } = await db.query(
        "SELECT points, config FROM challenges WHERE id = $1",
        [id]
      );
      const challenge = challengeRows[0];
      if (!challenge) return reply.status(404).send({ message: "Challenge not found" });
      const config = (challenge.config ?? {}) as { xp_per_milestone?: number; milestones?: number };
      const xpPerMilestone = config.xp_per_milestone ?? 20;
      const basePoints = challenge.points ?? 0;

      await ensureUserStats(db, userId);

      if (parsed.data.milestone) {
        const progId = randomUUID();
        await db.query(
          `INSERT INTO learning_progress (id, challenge_id, user_id, milestone, notes)
           VALUES ($1, $2, $3, $4, $5)`,
          [progId, id, userId, parsed.data.milestone, parsed.data.notes ?? null]
        );
        const xpEarned = xpPerMilestone;
        const { rows: statsRows } = await db.query(
          "SELECT total_xp FROM user_stats WHERE user_id = $1",
          [userId]
        );
        const currentXp = statsRows[0]?.total_xp ?? 0;
        const newXp = currentXp + xpEarned;
        await db.query(
          `UPDATE user_stats SET total_xp = $1, current_level = $2, rank_title = $3, last_activity_at = NOW(), updated_at = NOW()
           WHERE user_id = $4`,
          [newXp, getLevelFromXp(newXp), getRankName(newXp), userId]
        );
        const { rows: milCount } = await db.query(
          "SELECT COUNT(*) as c FROM learning_progress WHERE user_id = $1",
          [userId]
        );
        await checkAndAwardAchievements(db, userId, {
          totalMilestones: parseInt(milCount[0]?.c ?? "0", 10),
        });
      }

      if (parsed.data.completed) {
        await db.query(
          "UPDATE challenge_participations SET status = 'completed' WHERE challenge_id = $1 AND user_id = $2",
          [id, userId]
        );
        const xpEarned = basePoints > 0 ? basePoints : 50;
        const { rows: statsRows } = await db.query(
          "SELECT total_xp FROM user_stats WHERE user_id = $1",
          [userId]
        );
        const currentXp = statsRows[0]?.total_xp ?? 0;
        const newXp = currentXp + xpEarned;
        await db.query(
          `UPDATE user_stats SET total_xp = $1, current_level = $2, rank_title = $3, last_activity_at = NOW(), updated_at = NOW()
           WHERE user_id = $4`,
          [newXp, getLevelFromXp(newXp), getRankName(newXp), userId]
        );
        const { rows: completedCount } = await db.query(
          "SELECT COUNT(*) as c FROM challenge_participations WHERE user_id = $1 AND status = 'completed'",
          [userId]
        );
        await checkAndAwardAchievements(db, userId, {
          completedChallengesCount: parseInt(completedCount[0]?.c ?? "0", 10),
        });
      }

      const { rows: progressRows } = await db.query(
        "SELECT * FROM learning_progress WHERE challenge_id = $1 AND user_id = $2 ORDER BY milestone ASC",
        [id, userId]
      );
      return reply.send({
        progress: progressRows,
        message: parsed.data.milestone ? "Milestone recorded" : parsed.data.completed ? "Challenge completed" : "Updated",
      });
    }
  );

  app.post<{ Params: { id: string } }>(
    "/challenges/:id/check-in",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);
      if (!userId) return reply.status(401).send({ message: "Unauthorized" });

      const { id } = req.params;
      const { rows: partRows } = await db.query(
        "SELECT 1 FROM challenge_participations WHERE challenge_id = $1 AND user_id = $2 AND status = 'active'",
        [id, userId]
      );
      if (!partRows.length) return reply.status(403).send({ message: "Not enrolled in this challenge" });

      await ensureUserStats(db, userId);

      const { rows: statsRows } = await db.query(
        "SELECT streak_days, last_activity_at FROM user_stats WHERE user_id = $1",
        [userId]
      );
      const stats = statsRows[0];
      const lastAt = stats?.last_activity_at ? new Date(stats.last_activity_at) : null;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let newStreak = stats?.streak_days ?? 0;
      if (!lastAt) {
        newStreak = 1;
      } else {
        const lastDay = new Date(lastAt.getFullYear(), lastAt.getMonth(), lastAt.getDate());
        const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / (24 * 60 * 60 * 1000));
        if (diffDays === 0) {
          return reply.send({ streak: newStreak, message: "Already checked in today" });
        }
        if (diffDays === 1) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      }

      const bonusXp = calculateStreakBonus(newStreak);
      const xpEarned = 5 + bonusXp;

      const { rows: stats } = await db.query(
        "SELECT total_xp FROM user_stats WHERE user_id = $1",
        [userId]
      );
      const currentXp = stats[0]?.total_xp ?? 0;
      const newXp = currentXp + xpEarned;

      await db.query(
        `UPDATE user_stats SET streak_days = $1, last_activity_at = NOW(), total_xp = $2, 
         current_level = $3, rank_title = $4, updated_at = NOW() WHERE user_id = $5`,
        [newStreak, newXp, getLevelFromXp(newXp), getRankName(newXp), userId]
      );

      await checkAndAwardAchievements(db, userId, { streakDays: newStreak });

      return reply.send({ streak: newStreak, xp_earned: xpEarned });
    }
  );
}
