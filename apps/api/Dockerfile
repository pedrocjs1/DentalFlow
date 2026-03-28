# ── Stage 1: Builder ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json turbo.json tsconfig.json ./

# Copy the API app and all packages it depends on
COPY apps/api/ apps/api/
COPY packages/db/ packages/db/
COPY packages/shared/ packages/shared/
COPY packages/ai/ packages/ai/
COPY packages/messaging/ packages/messaging/
COPY packages/campaigns/ packages/campaigns/
COPY packages/connectors/ packages/connectors/

# Install dependencies (all workspaces)
RUN npm ci --ignore-scripts

# Generate Prisma client
RUN cd packages/db && npx prisma generate

# Build the API
RUN cd apps/api && npm run build

# ── Stage 2: Runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy workspace structure + installed node_modules from builder
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules/ ./node_modules/

# Copy built API
COPY --from=builder /app/apps/api/dist/ ./apps/api/dist/
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Copy packages (runtime needs them)
COPY --from=builder /app/packages/db/ ./packages/db/
COPY --from=builder /app/packages/shared/ ./packages/shared/
COPY --from=builder /app/packages/ai/ ./packages/ai/
COPY --from=builder /app/packages/messaging/ ./packages/messaging/
COPY --from=builder /app/packages/campaigns/ ./packages/campaigns/
COPY --from=builder /app/packages/connectors/ ./packages/connectors/

EXPOSE ${PORT:-3001}

CMD ["node", "apps/api/dist/server.js"]
