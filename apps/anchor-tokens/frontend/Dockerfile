# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for environment variables
ARG NEXT_PUBLIC_API_URL=http://localhost:3601
ARG NEXT_PUBLIC_WALLET_URL=http://localhost:8001

# Set environment variables for build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WALLET_URL=$NEXT_PUBLIC_WALLET_URL

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expose port
EXPOSE 3600

ENV PORT=3600
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
