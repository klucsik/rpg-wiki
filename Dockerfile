# Use official Node.js image as the base (Ubuntu-based)
FROM node:20 AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Set a dummy DATABASE_URL for Prisma generate (must be valid format, but not connectable)
ENV DATABASE_URL="postgresql://user:password@prisma-dummy-host:5432/dbname"
# Prevent Prisma from connecting to DB at build time
ENV PRISMA_SKIP_DB_INIT=1

# Generate Prisma client (does not require a real DB connection)
RUN npx prisma generate

# Build the Next.js app (should not require DB connection if code is correct)
RUN npm run build

# Production image (Ubuntu-based)
FROM node:20 AS runner
WORKDIR /app

# Copy entrypoint script first to optimize cache
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Copy only necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/next-env.d.ts ./next-env.d.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma

# Expose port
EXPOSE 3000

# Start the app using the entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]
