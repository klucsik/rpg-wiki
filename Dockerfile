# Use Alpine-based Node.js image for smaller size
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Prisma client generation stage
FROM node:20-alpine AS prisma
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --only=production
# Set a dummy DATABASE_URL for Prisma generate
ENV DATABASE_URL="postgresql://user:password@prisma-dummy-host:5432/dbname"
ENV PRISMA_SKIP_DB_INIT=1
RUN npx prisma generate

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
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

# Production image - minimal Alpine
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install only essential runtime dependencies
RUN apk add --no-cache libc6-compat openssl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Copy only necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=prisma --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the app using the entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]
