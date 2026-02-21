export const openApiDoc = {
  openapi: "3.0.3",
  info: {
    title: "Alumify API",
    version: "1.0.0",
    description: "Challenge-based alumni engagement API",
  },
  servers: [{ url: "/api/v1", description: "API v1" }],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: { 200: { description: "OK" } },
      },
    },
    "/auth/register": {
      post: {
        summary: "Register",
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { email: { type: "string" }, password: { type: "string" } }, required: ["email", "password"] } } } },
        responses: { 200: { description: "Success" }, 409: { description: "Email taken" } },
      },
    },
    "/auth/login": {
      post: {
        summary: "Login",
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { email: { type: "string" }, password: { type: "string" } }, required: ["email", "password"] } } } },
        responses: { 200: { description: "Success" }, 401: { description: "Invalid credentials" } },
      },
    },
    "/auth/refresh": {
      post: {
        summary: "Refresh access token",
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { refreshToken: { type: "string" } }, required: ["refreshToken"] } } } },
        responses: { 200: { description: "New access token" }, 401: { description: "Invalid/expired" } },
      },
    },
    "/auth/logout": {
      post: {
        summary: "Logout (revoke refresh token)",
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { refreshToken: { type: "string" } } } } } },
        responses: { 204: { description: "Logged out" } },
      },
    },
    "/auth/forgot-password": {
      post: {
        summary: "Request password reset",
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { email: { type: "string" } }, required: ["email"] } } } },
        responses: { 200: { description: "If account exists, email sent" } },
      },
    },
    "/auth/reset-password": {
      post: {
        summary: "Reset password with token",
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { token: { type: "string" }, password: { type: "string" } }, required: ["token", "password"] } } } },
        responses: { 200: { description: "Password reset" }, 400: { description: "Invalid/expired token" } },
      },
    },
    "/auth/verify-email": {
      post: {
        summary: "Verify email with token",
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { token: { type: "string" } }, required: ["token"] } } } },
        responses: { 200: { description: "Verified" }, 400: { description: "Invalid/expired token" } },
      },
    },
    "/auth/resend-verification": {
      post: {
        summary: "Resend verification email (requires auth)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Email sent" }, 400: { description: "Already verified" } },
      },
    },
    "/auth/me": {
      get: {
        summary: "Get current user (requires auth)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "User + profile" }, 401: { description: "Unauthorized" } },
      },
    },
    "/challenges": {
      get: {
        summary: "List challenges",
        parameters: [
          { name: "institution_id", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "type", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "offset", in: "query", schema: { type: "integer" } },
        ],
        responses: { 200: { description: "Challenges list" } },
      },
    },
    "/challenges/{id}": {
      get: {
        summary: "Get challenge",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Challenge" }, 404: { description: "Not found" } },
      },
    },
    "/challenges/{id}/join": {
      post: {
        summary: "Join challenge (requires auth)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { team_id: { type: "string" }, invite_code: { type: "string" } } } } } },
        responses: { 201: { description: "Joined" }, 403: { description: "Forbidden" } },
      },
    },
    "/challenges/{id}/invite": {
      post: {
        summary: "Create invite link (requires auth)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Invite code" }, 403: { description: "Must be enrolled" } },
      },
    },
    "/leaderboards": {
      get: {
        summary: "Leaderboards",
        parameters: [
          { name: "scope", in: "query", schema: { enum: ["global", "institution"] } },
          { name: "type", in: "query", schema: { type: "string" } },
          { name: "period", in: "query", schema: { enum: ["all_time", "weekly"] } },
        ],
        responses: { 200: { description: "Entries" } },
      },
    },
    "/me/nudges": {
      get: {
        summary: "Get nudges (requires auth)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Nudges list" } },
      },
    },
    "/me/push-token": {
      post: {
        summary: "Register push token (requires auth)",
        security: [{ bearerAuth: [] }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { token: { type: "string" } }, required: ["token"] } } } },
        responses: { 204: { description: "Registered" } },
      },
    },
    "/me/preferences": {
      patch: {
        summary: "Update preferences (requires auth)",
        security: [{ bearerAuth: [] }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { notify_streak_risk: { type: "boolean" }, notify_milestone_near: { type: "boolean" } } } } } },
        responses: { 200: { description: "Preferences" } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
};
