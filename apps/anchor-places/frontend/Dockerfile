# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy anchor-ui first (local dependency)
COPY libs/js/anchor-ui ./libs/js/anchor-ui

# Build anchor-ui
WORKDIR /app/libs/js/anchor-ui
RUN npm install && npm run build

# Move to frontend directory
WORKDIR /app/frontend

# Copy package files
COPY apps/anchor-places/frontend/package.json ./

# Update the anchor-ui path for Docker context
RUN sed -i 's|file:../../../libs/js/anchor-ui|file:/app/libs/js/anchor-ui|g' package.json

# Install dependencies
RUN npm install

# Copy source files
COPY apps/anchor-places/frontend/ .

# Build-time environment variables for Next.js
ARG NEXT_PUBLIC_API_URL=http://localhost:3301
ARG NEXT_PUBLIC_WALLET_URL=http://localhost:8001
ARG NEXT_PUBLIC_BLOCK_EXPLORER_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WALLET_URL=${NEXT_PUBLIC_WALLET_URL}
ENV NEXT_PUBLIC_BLOCK_EXPLORER_URL=${NEXT_PUBLIC_BLOCK_EXPLORER_URL}
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built files
COPY --from=builder /app/frontend/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static

USER nextjs

EXPOSE 3300

ENV PORT=3300
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
