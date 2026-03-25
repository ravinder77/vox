# =============================================================================
# Stage 1: deps — install production + dev dependencies
# =============================================================================
FROM node:24-alpine AS deps

WORKDIR /app

# Copy only manifests first for better layer caching
COPY package*.json ./

# Install all deps (dev included — needed for build)
RUN npm ci --ignore-scripts

# =============================================================================
# Stage 2: build — generate Prisma client, compile TypeScript
# =============================================================================
FROM deps AS build

# Copy Prisma schema first — db:generate is expensive, keep it cached
# separately from source changes
COPY prisma ./prisma

# Generate Prisma client (binaryTargets must include linux-musl for Alpine)
RUN npm run db:generate

# Now copy source — changes here won't invalidate the db:generate layer
COPY src ./src
COPY test ./test
COPY tsconfig.json ./
COPY tsconfig.test.json ./
COPY prisma.config.ts ./

# Compile TypeScript
RUN npm run build

# =============================================================================
# Stage 3: runtime — lean production image
# =============================================================================
FROM node:24-alpine AS runtime

WORKDIR /app

# Runtime environment defaults — override at deploy time via --env / env_file
ENV NODE_ENV=production \
    PORT=4000

# Create non-root user and install wget for healthcheck in one layer
RUN addgroup -S appgroup \
    && adduser -S appuser -G appgroup \
    && apk add --no-cache wget

# Copy only what the app needs to run
# Fresh npm ci --omit=dev gives a clean, auditable node_modules
COPY --from=build --chown=appuser:appgroup /app/package*.json ./

RUN npm ci --omit=dev --ignore-scripts

# Copy compiled output and Prisma artifacts
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/prisma ./prisma

# Prisma generates its query engine into node_modules at db:generate time.
# We need to copy it from the build stage since we ran a fresh npm ci above.
# The path varies by Prisma version — adjust if using a different engine type.
COPY --from=build --chown=appuser:appgroup \
    /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=appuser:appgroup \
    /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Drop to non-root for all subsequent operations
USER appuser

EXPOSE 4000

# wget-based healthcheck — no curl needed, matches the wget already installed
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:4000/health || exit 1

# Use exec form to receive signals correctly (no shell wrapper)
CMD ["node", "dist/src/server.js"]