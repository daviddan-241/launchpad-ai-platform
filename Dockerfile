FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/launchpad/package.json ./artifacts/launchpad/
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build shared libs
FROM deps AS libs
COPY tsconfig.base.json tsconfig.json ./
COPY lib/ ./lib/
RUN pnpm run typecheck:libs

# Build frontend
FROM libs AS frontend-build
COPY artifacts/launchpad/ ./artifacts/launchpad/
RUN pnpm --filter @workspace/launchpad run build

# Build API server
FROM libs AS api-build
COPY artifacts/api-server/ ./artifacts/api-server/
RUN pnpm --filter @workspace/api-server run build

# Production image — API + pre-built frontend static files
FROM node:24-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# Copy production deps for API server only
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-server/package.json ./lib/api-server/ 2>/dev/null || true
COPY artifacts/api-server/package.json ./artifacts/api-server/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts 2>/dev/null || true

# Copy built artifacts
COPY --from=api-build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=frontend-build /app/artifacts/launchpad/dist ./artifacts/launchpad/dist

# Serve frontend as static files from the API
COPY --from=deps /app/node_modules ./node_modules

# Set up static file serving — API serves the frontend at /
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
