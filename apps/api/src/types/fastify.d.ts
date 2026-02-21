import type { Pool } from "pg";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) => Promise<void>;
    optionalAuthenticate: (req: import("fastify").FastifyRequest) => Promise<void>;
    db: Pool;
  }
}
