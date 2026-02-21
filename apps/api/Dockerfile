FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
RUN pnpm build --filter=@alumify/shared --filter=@alumify/api

FROM base AS runner
RUN apk add --no-cache curl
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/migrations ./apps/api/migrations
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/migrate.json ./apps/api/
COPY apps/api/scripts/docker-entrypoint.sh ./apps/api/scripts/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
WORKDIR /app
EXPOSE 3001
RUN chmod +x /app/apps/api/scripts/docker-entrypoint.sh
ENTRYPOINT ["/app/apps/api/scripts/docker-entrypoint.sh"]
