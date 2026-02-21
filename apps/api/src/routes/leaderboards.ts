import type { FastifyInstance, FastifyRequest } from "fastify";

function getUserId(req: FastifyRequest): string | null {
  try {
    return (req.user as { sub?: string })?.sub ?? null;
  } catch {
    return null;
  }
}

export async function leaderboardsRoutes(app: FastifyInstance) {
  const db = app.db;

  app.get("/leaderboards", { preHandler: [app.optionalAuthenticate] }, async (req, reply) => {
    const q = req.query as { scope?: string; type?: string; period?: string; institution_id?: string; challenge_id?: string };
    let scope = q.scope ?? "global";
    const type = q.type ?? "user";
    const period = q.period ?? "all_time";
    const limit = 50;

    let institutionId = q.institution_id;
    if (scope === "institution" && !institutionId) {
      const userId = getUserId(req);
      if (userId) {
        const { rows } = await db.query("SELECT institution_id FROM alumni_profiles WHERE user_id = $1", [userId]);
        institutionId = rows[0]?.institution_id ?? null;
      }
    }
    if (scope === "institution" && !institutionId) {
      return reply.send({ entries: [] });
    }

    if (type === "user") {
      const period = q.period ?? "all_time";
      const weekStart = period === "weekly" ? new Date() : null;
      if (weekStart) {
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
        weekStart.setHours(0, 0, 0, 0);
      }

      if (scope === "challenge" && q.challenge_id) {
        let chSql = `
          SELECT u.id, u.email, us.total_xp, us.current_level, us.streak_days, us.rank_title
          FROM users u
          JOIN challenge_participations cp ON u.id = cp.user_id
          LEFT JOIN user_stats us ON u.id = us.user_id
          WHERE cp.challenge_id = $1 AND cp.status IN ('active','completed')
        `;
        const chParams: unknown[] = [q.challenge_id];
        if (period === "weekly" && weekStart) {
          chSql += ` AND us.last_activity_at >= $2`;
          chParams.push(weekStart.toISOString());
        }
        chSql += ` ORDER BY us.total_xp DESC NULLS LAST LIMIT $${chParams.length + 1}`;
        chParams.push(limit);
        const { rows } = await db.query(chSql, chParams);
        const entries = rows.map((r: any, i: number) => ({
          rank: i + 1,
          user_id: r.id,
          email: r.email,
          total_xp: parseInt(r.total_xp, 10) || 0,
          current_level: r.current_level ?? 1,
          streak_days: r.streak_days ?? 0,
          rank_title: r.rank_title ?? "Rookie",
          institution_name: r.institution_name,
        }));
        return reply.send({ entries });
      }

      let sql = `
        SELECT u.id, u.email, us.total_xp, us.current_level, us.streak_days, us.rank_title,
               p.institution_id, i.name as institution_name
        FROM users u
        JOIN user_stats us ON u.id = us.user_id
        LEFT JOIN alumni_profiles p ON u.id = p.user_id
        LEFT JOIN institutions i ON p.institution_id = i.id
        WHERE us.total_xp > 0
      `;
      const params: unknown[] = [];
      let idx = 1;
      if (scope === "institution" && institutionId) {
        sql += ` AND p.institution_id = $${idx++}`;
        params.push(institutionId);
      }
      if (period === "weekly" && weekStart) {
        sql += ` AND us.last_activity_at >= $${idx++}`;
        params.push(weekStart.toISOString());
      }
      sql += ` ORDER BY us.total_xp DESC LIMIT $${idx}`;
      params.push(limit);
      try {
        const { rows } = await db.query(sql, params);
        const entries = rows.map((r: any, i: number) => ({
          rank: i + 1,
          user_id: r.id,
          email: r.email,
          total_xp: parseInt(r.total_xp, 10) || 0,
          current_level: r.current_level ?? 1,
          streak_days: r.streak_days ?? 0,
          rank_title: r.rank_title ?? "Rookie",
          institution_name: r.institution_name,
        }));
        return reply.send({ entries });
      } catch {
        return reply.send({ entries: [] });
      }
    }

    return reply.send({ entries: [] });
  });
}
