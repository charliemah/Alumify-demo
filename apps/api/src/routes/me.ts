import type { FastifyInstance, FastifyRequest } from "fastify";
import { computeNudges } from "../services/nudges.js";

function getUserId(req: FastifyRequest): string | null {
  return (req.user as { sub?: string })?.sub ?? null;
}

export async function meRoutes(app: FastifyInstance) {
  const db = app.db;

  app.get("/me/stats", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) return reply.status(401).send({ message: "Unauthorized" });

    const { rows } = await db.query(
      "SELECT total_xp, current_level, streak_days, last_activity_at, rank_title FROM user_stats WHERE user_id = $1",
      [userId]
    );
    const stats = rows[0];
    const { rows: achRows } = await db.query(
      `SELECT a.code, a.name, a.description, a.icon_url, a.xp_reward, ua.earned_at
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.earned_at DESC`,
      [userId]
    );
    if (!stats) {
      return reply.send({
        stats: {
          total_xp: 0,
          current_level: 1,
          streak_days: 0,
          last_activity_at: null,
          rank_title: "Rookie",
        },
        achievements: achRows,
      });
    }
    return reply.send({
      stats,
      achievements: achRows,
    });
  });

  app.get("/me/achievements", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) return reply.status(401).send({ message: "Unauthorized" });

    const { rows: earned } = await db.query(
      `SELECT a.code, a.name, a.description, a.icon_url, a.xp_reward, ua.earned_at
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.earned_at DESC`,
      [userId]
    );
    const { rows: all } = await db.query(
      "SELECT code, name, description, icon_url, xp_reward FROM achievements ORDER BY xp_reward ASC"
    );
    const earnedCodes = new Set(earned.map((r: any) => r.code));
    const achievements = all.map((a: any) => ({
      ...a,
      earned: earnedCodes.has(a.code),
      earned_at: earned.find((e: any) => e.code === a.code)?.earned_at ?? null,
    }));
    return reply.send({ achievements });
  });

  app.get("/me/nudges", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) return reply.status(401).send({ message: "Unauthorized" });
    const nudges = await computeNudges(db, userId);
    return reply.send({ nudges });
  });

  app.post("/me/push-token", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) return reply.status(401).send({ message: "Unauthorized" });
    const body = req.body as { token?: string };
    if (typeof body?.token !== "string" || !body.token.trim()) {
      return reply.status(400).send({ message: "token is required" });
    }
    const token = body.token.trim();
    if (!/^(ExpoPushToken|ExponentPushToken)\[[-A-Za-z0-9_]+\]$/.test(token)) {
      return reply.status(400).send({ message: "Invalid Expo push token format" });
    }
    await db.query(
      `INSERT INTO push_tokens (user_id, token) VALUES ($1, $2)
       ON CONFLICT (user_id, token) DO UPDATE SET updated_at = NOW()`,
      [userId, token]
    );
    return reply.status(204).send();
  });

  app.get("/me/preferences", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) return reply.status(401).send({ message: "Unauthorized" });
    const { rows } = await db.query("SELECT * FROM user_preferences WHERE user_id = $1", [userId]);
    return reply.send({ preferences: rows[0] ?? { notify_streak_risk: true, notify_milestone_near: true } });
  });

  app.patch("/me/preferences", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) return reply.status(401).send({ message: "Unauthorized" });

    const body = req.body as Record<string, unknown>;
    const setClauses: string[] = [];
    const values: unknown[] = [userId];
    let idx = 2;
    if (typeof body.notify_streak_risk === "boolean") {
      setClauses.push(`notify_streak_risk = $${idx++}`);
      values.push(body.notify_streak_risk);
    }
    if (typeof body.notify_milestone_near === "boolean") {
      setClauses.push(`notify_milestone_near = $${idx++}`);
      values.push(body.notify_milestone_near);
    }
    if (setClauses.length === 0) {
      const { rows } = await db.query("SELECT * FROM user_preferences WHERE user_id = $1", [userId]);
      return reply.send({ preferences: rows[0] ?? {} });
    }
    const notifyStreak = typeof body.notify_streak_risk === "boolean" ? body.notify_streak_risk : true;
    const notifyMilestone = typeof body.notify_milestone_near === "boolean" ? body.notify_milestone_near : true;
    setClauses.push("updated_at = NOW()");
    const insertValues = [userId, notifyStreak, notifyMilestone];
    const paramOffset = 4;
    const updateSet = setClauses
      .map((c, i) => (c.includes("$") ? c.replace(/\$\d+/, `$${paramOffset + i}`) : c))
      .join(", ");
    await db.query(
      `INSERT INTO user_preferences (user_id, notify_streak_risk, notify_milestone_near)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET ${updateSet}`,
      [...insertValues, ...values.slice(1)]
    );
    const { rows } = await db.query("SELECT * FROM user_preferences WHERE user_id = $1", [userId]);
    return reply.send({ preferences: rows[0] ?? {} });
  });
}
