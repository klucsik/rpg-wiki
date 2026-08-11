# Prisma client generation stage
FROM node:20-bookworm-slim AS prisma
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
# Set a dummy DATABASE_URL for Prisma generate
ENV DATABASE_URL="postgresql://user:password@prisma-dummy-host:5432/dbname"
ENV PRISMA_SKIP_DB_INIT=1
# Generate Prisma client with correct binary target for Alpine
RUN npx prisma generate --generator client

# Build stage
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
# Builder stage only needs JS packages to compile Next.js output.
# Skip browser downloads here to avoid long/stuck installs (runtime deps come from deps stage).
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci --no-audit --no-fund
COPY . .
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Set a dummy DATABASE_URL for build process
ENV DATABASE_URL="postgresql://user:password@prisma-dummy-host:5432/dbname"
# Skip database operations during build
ENV SKIP_ENV_VALIDATION=1
ENV PRISMA_SKIP_DB_INIT=1

# Build the Next.js app with standalone output
RUN npm run build

# Production image - minimal Debian
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install only essential runtime dependencies including git for backup functionality
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates git openssh-client && rm -rf /var/lib/apt/lists/* && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

# Only install Prisma CLI needed by entrypoint migrations; runtime app deps come from standalone output.
ARG PRISMA_CLI_VERSION=6.19.1
RUN npm install --no-save --omit=dev --no-audit --no-fund prisma@${PRISMA_CLI_VERSION} && npm cache clean --force

# Copy entrypoint script with execute permissions and proper ownership
COPY --chmod=744 --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh

# Copy only necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/CHANGELOG.md ./CHANGELOG.md
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=prisma --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the app using the entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]
