FROM node:22-slim AS base
RUN npm install -g pnpm

# Stage: install all dependencies (includes native compilation of better-sqlite3)
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/api/package.json ./packages/api/
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/backend/package.json ./packages/backend/
RUN pnpm install --frozen-lockfile
RUN pnpm rebuild better-sqlite3

# Stage: build api types + frontend
FROM deps AS frontend-builder
COPY tsconfig.base.json ./
COPY packages/api ./packages/api
COPY packages/frontend ./packages/frontend
RUN pnpm --filter @app/api build
RUN pnpm --filter @app/frontend build

# Stage: build backend
FROM deps AS backend-builder
COPY tsconfig.base.json ./
COPY packages/backend ./packages/backend
RUN pnpm --filter @app/backend build

# Stage: production (no build tools needed — node_modules copied from deps)
FROM base AS production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=deps /app/packages/backend/package.json ./packages/backend/package.json
COPY --from=backend-builder /app/packages/backend/dist ./packages/backend/dist
COPY packages/backend/drizzle ./packages/backend/drizzle
COPY --from=frontend-builder /app/packages/frontend/dist ./packages/frontend/dist

EXPOSE 3000
CMD ["node", "packages/backend/dist/index.js"]
