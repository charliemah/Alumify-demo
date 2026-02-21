import type { FastifyInstance } from "fastify";

export async function institutionsRoutes(app: FastifyInstance) {
  app.get("/institutions", async (req, reply) => {
    const q = req.query as { search?: string; limit?: string };
    const limit = Math.min(parseInt(q.limit ?? "50", 10), 100);
    let sql = "SELECT id, name, slug, domain, logo_url, created_at FROM institutions";
    const params: unknown[] = [];
    if (q.search?.trim()) {
      sql += " WHERE name ILIKE $1 OR slug ILIKE $1";
      params.push(`%${q.search.trim()}%`);
    }
    sql += " ORDER BY name ASC LIMIT $" + (params.length + 1);
    params.push(limit);
    const { rows } = await app.db.query(sql, params);
    return reply.send({ institutions: rows });
  });

  app.get<{ Params: { id: string } }>("/institutions/:id", async (req, reply) => {
    const { id } = req.params;
    const { rows } = await app.db.query(
      "SELECT id, name, slug, domain, logo_url, created_at FROM institutions WHERE id = $1",
      [id]
    );
    const institution = rows[0];
    if (!institution) return reply.status(404).send({ message: "Institution not found" });
    return reply.send({ institution });
  });
}
