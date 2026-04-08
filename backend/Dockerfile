# =============================================================================
# Stage 1: deps — install production + dev dependencies
# =============================================================================
FROM node:24-trixie-slim AS deps

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

# Generate Prisma client for the runtime platform
RUN npm run db:generate

# Now copy source — changes here won't invalidate the db:generate layer
COPY src ./src
COPY tests ./test
COPY tsconfig.json ./
COPY tsconfig.test.json ./
COPY prisma.config.ts ./

# Compile TypeScript
RUN npm run build

# =============================================================================
# Stage 3: runtime — lean production image
# =============================================================================
FROM node:24-trixie-slim AS runtime

WORKDIR /app

# Runtime environment defaults — override at deploy time via --env / env_file
ENV NODE_ENV=production \
    PORT=4000

# Bring base OS packages to their latest patched state before the security scan.
RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user without adding extra OS packages.
RUN groupadd --system appgroup \
    && useradd --system --gid appgroup --create-home --home-dir /app appuser

# Copy only what the app needs to run.
# Keep the lockfile only long enough for npm ci, then remove it so image
# scanners do not report dev-only dependencies from the full project lockfile.
COPY --from=build --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=build --chown=appuser:appgroup /app/package-lock.json ./package-lock.json

RUN npm ci --omit=dev --ignore-scripts \
    && rm -f package-lock.json

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

# Use Node's built-in fetch for healthchecks to avoid adding curl/wget packages.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Use exec form to receive signals correctly (no shell wrapper)
CMD ["node", "dist/src/server.js"]
