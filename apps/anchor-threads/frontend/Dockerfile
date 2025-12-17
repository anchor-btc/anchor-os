# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build-time environment variables for Next.js
ARG NEXT_PUBLIC_API_URL=http://localhost:3101
ARG NEXT_PUBLIC_WALLET_URL=http://localhost:8001
ARG NEXT_PUBLIC_BTC_EXPLORER_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WALLET_URL=$NEXT_PUBLIC_WALLET_URL
ENV NEXT_PUBLIC_BTC_EXPLORER_URL=$NEXT_PUBLIC_BTC_EXPLORER_URL

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3100

ENV PORT=3100
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
