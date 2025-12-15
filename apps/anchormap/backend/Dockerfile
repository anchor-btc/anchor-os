# Build stage
FROM rust:1.85-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace files
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
COPY apps ./apps
COPY packages ./packages
COPY explorer ./explorer

# Force rebuild (change this to force rebuild)
ARG CACHE_BUST=v2

# Build the application
RUN cargo build --release --bin anchormap-backend

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the binary
COPY --from=builder /app/target/release/anchormap-backend /app/anchormap-backend

# Expose port
EXPOSE 3004

# Run the application
CMD ["/app/anchormap-backend"]

