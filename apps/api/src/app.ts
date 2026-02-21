import Fastify, { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { authRoutes } from "./routes/auth.js";
import { challengesRoutes } from "./routes/challenges.js";
import { institutionsRoutes } from "./routes/institutions.js";
import { profilesRoutes } from "./routes/profiles.js";
import { meRoutes } from "./routes/me.js";
import { teamsRoutes } from "./routes/teams.js";
import { discussionsRoutes } from "./routes/discussions.js";
import { leaderboardsRoutes } from "./routes/leaderboards.js";
import { db } from "./db/index.js";

const isDev = config.nodeEnv === "development";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: isDev
      ? { transport: { target: "pino-pretty", options: { colorize: true } } }
      : true,
  });

  await app.register(cors, {
    origin:
      config.corsOrigin === true || !config.corsOrigin
        ? true
        : String(config.corsOrigin)
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean),
  });
  if (config.nodeEnv === "production" && config.jwtSecret === "dev-secret-change-in-production") {
    app.log.warn("JWT_SECRET is not set! Using default. Set JWT_SECRET in production.");
  }
  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
  });
  await app.register(jwt, { secret: config.jwtSecret });

  app.decorate("authenticate", async function (req: FastifyRequest, reply: FastifyReply) {
    try {
      await req.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: "Unauthorized" });
    }
  });

  app.decorate("optionalAuthenticate", async function (req: FastifyRequest) {
    try {
      await req.jwtVerify();
    } catch {
      // No token or invalid - req.user stays undefined
    }
  });

  app.decorate("db", db);

  app.register(authRoutes, { prefix: "/api/v1" });
  app.register(challengesRoutes, { prefix: "/api/v1" });
  app.register(institutionsRoutes, { prefix: "/api/v1" });
  app.register(profilesRoutes, { prefix: "/api/v1" });
  app.register(meRoutes, { prefix: "/api/v1" });
  app.register(teamsRoutes, { prefix: "/api/v1" });
  app.register(discussionsRoutes, { prefix: "/api/v1" });
  app.register(leaderboardsRoutes, { prefix: "/api/v1" });

  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  const { openApiDoc } = await import("./openapi.js");
  app.get("/docs/json", async (_, reply) => {
    reply.type("application/json").send(openApiDoc);
  });
  app.get("/docs", async (_, reply) => {
    reply.type("text/html").send(`
<!DOCTYPE html>
<html>
<head>
  <title>Alumify API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/docs/json',
      dom_id: '#swagger-ui',
    });
  </script>
</body>
</html>`);
  });

  app.setErrorHandler((err, req, reply) => {
    const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
    const message = statusCode >= 500 ? "Internal server error" : (err as Error).message;
    req.log.error({ err, url: req.url, method: req.method }, "Request error");
    reply.status(statusCode).send({ message });
  });

  return app;
}
