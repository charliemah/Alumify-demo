import type { FastifyInstance, FastifyRequest } from "fastify";
import { updateProfileSchema } from "@alumify/shared";
import { randomUUID } from "crypto";

function getUserId(req: FastifyRequest): string | null {
  return (req.user as { sub?: string })?.sub ?? null;
}

export async function profilesRoutes(app: FastifyInstance) {
  app.get("/profiles/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) return reply.status(401).send({ message: "Unauthorized" });

    const { rows } = await app.db.query(
      `SELECT p.*, i.name as institution_name, i.slug as institution_slug
       FROM alumni_profiles p
       LEFT JOIN institutions i ON p.institution_id = i.id
       WHERE p.user_id = $1`,
      [userId]
    );
    const profile = rows[0];
    if (!profile) {
      return reply.send({ profile: null });
    }
    const { institution_name, institution_slug, ...rest } = profile;
    return reply.send({
      profile: {
        ...rest,
        institution: profile.institution_id
          ? { name: institution_name, slug: institution_slug }
          : null,
      },
    });
  });

  app.patch("/profiles/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) return reply.status(401).send({ message: "Unauthorized" });

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0]?.message ?? "Validation failed" });
    }
    const data = parsed.data;

    const { rows: existing } = await app.db.query(
      "SELECT id FROM alumni_profiles WHERE user_id = $1",
      [userId]
    );

    if (existing.length === 0) {
      const id = randomUUID();
      const cols = ["id", "user_id"];
      const vals: unknown[] = [id, userId];
      if (data.institution_id !== undefined) {
        cols.push("institution_id");
        vals.push(data.institution_id);
      }
      if (data.grad_year !== undefined) {
        cols.push("grad_year");
        vals.push(data.grad_year);
      }
      if (data.degree !== undefined) {
        cols.push("degree");
        vals.push(data.degree);
      }
      if (data.bio !== undefined) {
        cols.push("bio");
        vals.push(data.bio);
      }
      if (data.avatar_url !== undefined) {
        cols.push("avatar_url");
        vals.push(data.avatar_url);
      }
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      await app.db.query(
        `INSERT INTO alumni_profiles (${cols.join(", ")}) VALUES (${placeholders})`,
        vals
      );
      const { rows: created } = await app.db.query(
        "SELECT * FROM alumni_profiles WHERE id = $1",
        [id]
      );
      return reply.send({ profile: created[0] });
    }

    const updates: string[] = ["updated_at = NOW()"];
    const values: unknown[] = [];
    let idx = 1;
    if (data.institution_id !== undefined) {
      updates.push(`institution_id = $${idx++}`);
      values.push(data.institution_id);
    }
    if (data.grad_year !== undefined) {
      updates.push(`grad_year = $${idx++}`);
      values.push(data.grad_year);
    }
    if (data.degree !== undefined) {
      updates.push(`degree = $${idx++}`);
      values.push(data.degree);
    }
    if (data.bio !== undefined) {
      updates.push(`bio = $${idx++}`);
      values.push(data.bio);
    }
    if (data.avatar_url !== undefined) {
      updates.push(`avatar_url = $${idx++}`);
      values.push(data.avatar_url);
    }
    if (updates.length === 1) {
      const { rows } = await app.db.query(
        "SELECT * FROM alumni_profiles WHERE user_id = $1",
        [userId]
      );
      return reply.send({ profile: rows[0] });
    }
    values.push(userId);
    await app.db.query(
      `UPDATE alumni_profiles SET ${updates.join(", ")} WHERE user_id = $${idx}`,
      values
    );
    const { rows } = await app.db.query(
      "SELECT * FROM alumni_profiles WHERE user_id = $1",
      [userId]
    );
    return reply.send({ profile: rows[0] });
  });
}
