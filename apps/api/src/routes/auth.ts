import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "@alumify/shared";
import { config } from "../config.js";
import { randomUUID } from "crypto";
import { sendPasswordResetEmail, sendVerificationEmail } from "../email.js";

interface RegisterBody {
  email: string;
  password: string;
  name?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: RegisterBody }>("/auth/register", async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0]?.message ?? "Validation failed" });
    }
    const { email, password } = parsed.data;
    const password_hash = await bcrypt.hash(password, 10);
    const id = randomUUID();
    try {
      await app.db.query(
        "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email, created_at",
        [id, email, password_hash]
      );
    } catch (err: any) {
      if (err.code === "23505") {
        return reply.status(409).send({ message: "Email already registered" });
      }
      throw err;
    }
    const user = { id, email };
    const accessToken = app.jwt.sign({ sub: id }, { expiresIn: config.jwtExpiresIn });
    const refreshToken = app.jwt.sign({ sub: id, type: "refresh" }, { expiresIn: config.refreshExpiresIn });
    await app.db.query("DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at < NOW()", [id]);
    await app.db.query(
      "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
      [randomUUID(), id, await bcrypt.hash(refreshToken, 10), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
    );
    // Send verification email (non-blocking)
    const evToken = randomUUID().replace(/-/g, "");
    const evExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await app.db.query(
      "INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
      [randomUUID(), id, await bcrypt.hash(evToken, 10), evExpiry]
    );
    sendVerificationEmail(email, `${config.appUrl}/verify-email?token=${evToken}`).catch(() => {});
    return reply.send({ user, accessToken, refreshToken });
  });

  app.post<{ Body: LoginBody }>("/auth/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0]?.message ?? "Validation failed" });
    }
    const { email, password } = parsed.data;
    const { rows } = await app.db.query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return reply.status(401).send({ message: "Invalid email or password" });
    }
    const accessToken = app.jwt.sign({ sub: user.id }, { expiresIn: config.jwtExpiresIn });
    const refreshToken = app.jwt.sign({ sub: user.id, type: "refresh" }, { expiresIn: config.refreshExpiresIn });
    await app.db.query("DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at < NOW()", [user.id]);
    await app.db.query(
      "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
      [randomUUID(), user.id, await bcrypt.hash(refreshToken, 10), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
    );
    return reply.send({
      user: { id: user.id, email: user.email },
      accessToken,
      refreshToken,
    });
  });

  app.post<{ Body: { refreshToken: string } }>("/auth/refresh", async (req, reply) => {
    const { refreshToken } = req.body ?? {};
    if (!refreshToken || typeof refreshToken !== "string") {
      return reply.status(400).send({ message: "Refresh token required" });
    }
    try {
      const decoded = app.jwt.verify(refreshToken) as { sub: string; type?: string };
      if (decoded.type !== "refresh") {
        return reply.status(401).send({ message: "Invalid token" });
      }
      const { rows } = await app.db.query(
        "SELECT id, token_hash FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW() ORDER BY expires_at DESC",
        [decoded.sub]
      );
      let valid = false;
      for (const row of rows) {
        if (await bcrypt.compare(refreshToken, row.token_hash)) {
          valid = true;
          break;
        }
      }
      if (!valid) {
        return reply.status(401).send({ message: "Refresh token expired or invalid" });
      }
      const accessToken = app.jwt.sign({ sub: decoded.sub }, { expiresIn: config.jwtExpiresIn });
      return reply.send({ accessToken });
    } catch {
      return reply.status(401).send({ message: "Invalid token" });
    }
  });

  app.post<{ Body: { refreshToken?: string } }>("/auth/logout", async (req, reply) => {
    const { refreshToken } = req.body ?? {};
    if (refreshToken && typeof refreshToken === "string") {
      try {
        const decoded = app.jwt.verify(refreshToken) as { sub: string; type?: string };
        if (decoded.type === "refresh") {
          const { rows } = await app.db.query(
            "SELECT id, token_hash FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW()",
            [decoded.sub]
          );
          for (const row of rows) {
            if (await bcrypt.compare(refreshToken, row.token_hash)) {
              await app.db.query("DELETE FROM refresh_tokens WHERE id = $1", [row.id]);
              break;
            }
          }
        }
      } catch {
        // Invalid token - already expired or malformed
      }
    }
    return reply.status(204).send();
  });

  app.post<{ Body: { email: string } }>("/auth/forgot-password", async (req, reply) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0]?.message ?? "Validation failed" });
    }
    const { email } = parsed.data;
    const { rows } = await app.db.query("SELECT id FROM users WHERE email = $1", [email]);
    if (rows[0]) {
      const userId = rows[0].id;
      await app.db.query(
        "DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at < NOW()",
        [userId]
      );
      const rawToken = randomUUID().replace(/-/g, "");
      const tokenHash = await bcrypt.hash(rawToken, 10);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await app.db.query(
        "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
        [randomUUID(), userId, tokenHash, expiresAt]
      );
      const resetUrl = `${config.appUrl}/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail(email, resetUrl);
    }
    return reply.send({ message: "If an account exists, you will receive a password reset link." });
  });

  app.post<{ Body: { token: string; password: string } }>("/auth/reset-password", async (req, reply) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0]?.message ?? "Validation failed" });
    }
    const { token, password } = parsed.data;
    const { rows } = await app.db.query(
      "SELECT id, user_id, token_hash FROM password_reset_tokens WHERE expires_at > NOW()"
    );
    let userId: string | null = null;
    for (const row of rows) {
      if (await bcrypt.compare(token, row.token_hash)) {
        userId = row.user_id;
        await app.db.query("DELETE FROM password_reset_tokens WHERE id = $1", [row.id]);
        break;
      }
    }
    if (!userId) {
      return reply.status(400).send({ message: "Invalid or expired reset link" });
    }
    const password_hash = await bcrypt.hash(password, 10);
    await app.db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [password_hash, userId]);
    return reply.send({ message: "Password reset successfully. You can now sign in." });
  });

  app.post<{ Body: { token: string } }>("/auth/verify-email", async (req, reply) => {
    const parsed = verifyEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: parsed.error.errors[0]?.message ?? "Validation failed" });
    }
    const { token } = parsed.data;
    const { rows } = await app.db.query(
      "SELECT id, user_id, token_hash FROM email_verification_tokens WHERE expires_at > NOW()"
    );
    let userId: string | null = null;
    for (const row of rows) {
      if (await bcrypt.compare(token, row.token_hash)) {
        userId = row.user_id;
        await app.db.query("DELETE FROM email_verification_tokens WHERE id = $1", [row.id]);
        break;
      }
    }
    if (!userId) {
      return reply.status(400).send({ message: "Invalid or expired verification link" });
    }
    await app.db.query("UPDATE users SET email_verified_at = NOW() WHERE id = $1", [userId]);
    return reply.send({ message: "Email verified successfully." });
  });

  app.post("/auth/resend-verification", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = (req.user as { sub: string })?.sub;
    if (!userId) return reply.status(401).send({ message: "Unauthorized" });
    const { rows } = await app.db.query("SELECT email, email_verified_at FROM users WHERE id = $1", [userId]);
    const user = rows[0];
    if (!user) return reply.status(404).send({ message: "User not found" });
    if (user.email_verified_at) {
      return reply.status(400).send({ message: "Email already verified" });
    }
    await app.db.query("DELETE FROM email_verification_tokens WHERE user_id = $1", [userId]);
    const evToken = randomUUID().replace(/-/g, "");
    const evExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await app.db.query(
      "INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
      [randomUUID(), userId, await bcrypt.hash(evToken, 10), evExpiry]
    );
    await sendVerificationEmail(user.email, `${config.appUrl}/verify-email?token=${evToken}`);
    return reply.send({ message: "Verification email sent." });
  });

  app.get("/auth/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = (req.user as { sub: string })?.sub;
    if (!userId) return reply.status(401).send({ message: "Unauthorized" });
    const { rows: userRows } = await app.db.query(
      "SELECT id, email, created_at, email_verified_at FROM users WHERE id = $1",
      [userId]
    );
    const user = userRows[0];
    if (!user) return reply.status(404).send({ message: "User not found" });
    const { rows: profileRows } = await app.db.query(
      "SELECT * FROM alumni_profiles WHERE user_id = $1 LIMIT 1",
      [userId]
    );
    const profile = profileRows[0] ?? null;
    return reply.send({ user, profile });
  });
}
