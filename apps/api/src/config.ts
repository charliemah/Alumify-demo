export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
  refreshExpiresIn: process.env.REFRESH_EXPIRES_IN ?? "7d",
  databaseUrl: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/alumify",
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX ?? "100", 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10),
  corsOrigin: process.env.CORS_ORIGIN ?? true,
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  fromEmail: process.env.FROM_EMAIL ?? "onboarding@resend.dev",
};
