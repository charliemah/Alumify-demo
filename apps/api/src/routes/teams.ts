import type { FastifyInstance, FastifyRequest } from "fastify";
import { createTeamSchema } from "@alumify/shared";
import { randomUUID } from "crypto";

function getUserId(req: FastifyRequest): string | null {
  return (req.user as { sub?: string })?.sub ?? null;
}

export async function teamsRoutes(app: FastifyInstance) {
  const db = app.db;

  app.get<{ Params: { id: string } }>("/challenges/:id/teams", async (req, reply) => {
    const { id } = req.params;
    const { rows } = await db.query(
      `SELECT t.*, 
        (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
       FROM teams t
       WHERE t.challenge_id = $1
       ORDER BY t.created_at ASC`,
      [id]
    );
    return reply.send({ teams: rows });
  });

  app.post<{ Params: { id: string }; Body: { name: string } }>(
    "/challenges/:id/teams",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);
      if (!userId) return reply.status(401).send({ message: "Unauthorized" });

      const parsed = createTeamSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: parsed.error.errors[0]?.message ?? "Validation failed" });
      }

      const { id } = req.params;
      const { rows: chalRows } = await db.query(
        "SELECT id, type, config FROM challenges WHERE id = $1",
        [id]
      );
      const challenge = chalRows[0];
      if (!challenge) return reply.status(404).send({ message: "Challenge not found" });
      if (challenge.type !== "group" && challenge.type !== "community") {
        return reply.status(400).send({ message: "Teams only available for group/community challenges" });
      }

      const { rows: partRows } = await db.query(
        "SELECT id FROM challenge_participations WHERE challenge_id = $1 AND user_id = $2",
        [id, userId]
      );
      if (!partRows.length) return reply.status(403).send({ message: "Join the challenge first" });

      const teamId = randomUUID();
      const maxSize = (challenge.config ?? {})?.max_team_size ?? 10;
      await db.query(
        "INSERT INTO teams (id, challenge_id, name) VALUES ($1, $2, $3)",
        [teamId, id, parsed.data.name]
      );
      await db.query(
        "INSERT INTO team_members (id, team_id, user_id, role) VALUES ($1, $2, $3, 'leader')",
        [randomUUID(), teamId, userId]
      );
      await db.query(
        "UPDATE challenge_participations SET team_id = $1 WHERE challenge_id = $2 AND user_id = $3",
        [teamId, id, userId]
      );

      const { rows } = await db.query(
        "SELECT t.*, 1 as member_count FROM teams t WHERE t.id = $1",
        [teamId]
      );
      return reply.status(201).send({ team: rows[0] });
    }
  );

  app.post<{ Params: { challengeId: string; teamId: string } }>(
    "/challenges/:challengeId/teams/:teamId/join",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);
      if (!userId) return reply.status(401).send({ message: "Unauthorized" });

      const { challengeId, teamId } = req.params;
      const { rows: teamRows } = await db.query(
        "SELECT t.*, c.config FROM teams t JOIN challenges c ON t.challenge_id = c.id WHERE t.id = $1 AND t.challenge_id = $2",
        [teamId, challengeId]
      );
      const team = teamRows[0];
      if (!team) return reply.status(404).send({ message: "Team not found" });

      const maxSize = (team.config ?? {}).max_team_size ?? 10;
      const { rows: countRows } = await db.query(
        "SELECT COUNT(*) as c FROM team_members WHERE team_id = $1",
        [teamId]
      );
      if (parseInt(countRows[0]?.c ?? "0", 10) >= maxSize) {
        return reply.status(400).send({ message: "Team is full" });
      }

      const { rows: partRows } = await db.query(
        "SELECT id, team_id FROM challenge_participations WHERE challenge_id = $1 AND user_id = $2",
        [challengeId, userId]
      );
      if (!partRows.length) return reply.status(403).send({ message: "Join the challenge first" });
      if (partRows[0].team_id) return reply.status(400).send({ message: "Already in a team" });

      try {
        await db.query(
          "INSERT INTO team_members (id, team_id, user_id, role) VALUES ($1, $2, $3, 'member')",
          [randomUUID(), teamId, userId]
        );
        await db.query(
          "UPDATE challenge_participations SET team_id = $1 WHERE challenge_id = $2 AND user_id = $3",
          [teamId, challengeId, userId]
        );
      } catch (err: any) {
        if (err.code === "23505") return reply.status(409).send({ message: "Already in this team" });
        throw err;
      }

      const { rows } = await db.query(
        "SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count FROM teams t WHERE t.id = $1",
        [teamId]
      );
      return reply.send({ team: rows[0], message: "Joined team" });
    }
  );
}
