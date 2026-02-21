import type { FastifyInstance, FastifyRequest } from "fastify";
import { createDiscussionSchema } from "@alumify/shared";
import { randomUUID } from "crypto";

function getUserId(req: FastifyRequest): string | null {
  return (req.user as { sub?: string })?.sub ?? null;
}

export async function discussionsRoutes(app: FastifyInstance) {
  const db = app.db;

  app.get<{ Params: { id: string }; Querystring: { team_id?: string } }>(
    "/challenges/:id/discussions",
    async (req, reply) => {
      const { id } = req.params;
      const q = req.query as { team_id?: string };
      let sql = `SELECT d.*, u.email as author_email
         FROM discussions d
         JOIN users u ON d.user_id = u.id
         WHERE d.challenge_id = $1 AND d.parent_id IS NULL`;
      const params: unknown[] = [id];
      let idx = 2;
      if (q.team_id) {
        sql += ` AND d.team_id = $${idx++}`;
        params.push(q.team_id);
      }
      sql += ` ORDER BY d.created_at DESC LIMIT 50`;
      const { rows } = await db.query(sql, params);
      const ids = rows.map((r: any) => r.id);
      let replies: any[] = [];
      if (ids.length) {
        const { rows: replyRows } = await db.query(
          `SELECT d.*, u.email as author_email
           FROM discussions d
           JOIN users u ON d.user_id = u.id
           WHERE d.parent_id = ANY($1::uuid[])
           ORDER BY d.created_at ASC`,
          [ids]
        );
        replies = replyRows;
      }
      const byParent: Record<string, any[]> = {};
      for (const r of replies) {
        if (!byParent[r.parent_id]) byParent[r.parent_id] = [];
        byParent[r.parent_id].push(r);
      }
      const result = rows.map((p: any) => ({
        ...p,
        replies: byParent[p.id] ?? [],
      }));
      return reply.send({ discussions: result });
    }
  );

  app.post<{ Params: { id: string }; Body: { body: string; parent_id?: string; team_id?: string } }>(
    "/challenges/:id/discussions",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);
      if (!userId) return reply.status(401).send({ message: "Unauthorized" });

      const parsed = createDiscussionSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: parsed.error.errors[0]?.message ?? "Validation failed" });
      }

      const { id } = req.params;
      const data = parsed.data;

      const { rows: partRows } = await db.query(
        "SELECT 1 FROM challenge_participations WHERE challenge_id = $1 AND user_id = $2",
        [id, userId]
      );
      if (!partRows.length) return reply.status(403).send({ message: "Join the challenge first" });

      const discussionId = randomUUID();
      await db.query(
        `INSERT INTO discussions (id, challenge_id, team_id, user_id, parent_id, body)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [discussionId, id, data.team_id ?? null, userId, data.parent_id ?? null, data.body]
      );

      const { rows } = await db.query(
        `SELECT d.*, u.email as author_email
         FROM discussions d
         JOIN users u ON d.user_id = u.id
         WHERE d.id = $1`,
        [discussionId]
      );
      return reply.status(201).send({ discussion: rows[0] });
    }
  );
}
