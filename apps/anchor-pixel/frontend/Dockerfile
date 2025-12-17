# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for environment variables (needed at build time for Next.js)
ARG NEXT_PUBLIC_API_URL=http://localhost:3201
ARG NEXT_PUBLIC_WALLET_URL=http://localhost:8001

# Set environment variables for build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WALLET_URL=$NEXT_PUBLIC_WALLET_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3200

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3200

CMD ["node", "server.js"]
