# Build stage
FROM rust:1.87-slim-bookworm AS builder

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace files
COPY Cargo.toml Cargo.lock ./
COPY libs/rust/anchor-core ./libs/rust/anchor-core
COPY libs/rust/anchor-specs ./libs/rust/anchor-specs
COPY admin/dashboard/backend ./admin/dashboard/backend

# Create dummy files for other workspace members
RUN mkdir -p internal/anchor-indexer/src && echo "fn main() {}" > internal/anchor-indexer/src/main.rs
RUN mkdir -p internal/anchor-wallet/src && echo "fn main() {}" > internal/anchor-wallet/src/main.rs
RUN mkdir -p internal/anchor-testnet/src && echo "fn main() {}" > internal/anchor-testnet/src/main.rs
RUN mkdir -p libs/rust/anchor-wallet-lib/src && echo "" > libs/rust/anchor-wallet-lib/src/lib.rs
RUN mkdir -p apps/anchor-threads/backend/src && echo "fn main() {}" > apps/anchor-threads/backend/src/main.rs
RUN mkdir -p apps/anchor-canvas/backend/src && echo "fn main() {}" > apps/anchor-canvas/backend/src/main.rs
RUN mkdir -p apps/anchor-places/backend/src && echo "fn main() {}" > apps/anchor-places/backend/src/main.rs
RUN mkdir -p apps/anchor-domains/backend/src && echo "fn main() {}" > apps/anchor-domains/backend/src/main.rs
RUN mkdir -p apps/anchor-proofs/backend/src && echo "fn main() {}" > apps/anchor-proofs/backend/src/main.rs
RUN mkdir -p apps/anchor-tokens/backend/src && echo "fn main() {}" > apps/anchor-tokens/backend/src/main.rs
RUN mkdir -p apps/anchor-oracles/backend/src && echo "fn main() {}" > apps/anchor-oracles/backend/src/main.rs
RUN mkdir -p apps/anchor-predictions/backend/src && echo "fn main() {}" > apps/anchor-predictions/backend/src/main.rs
RUN mkdir -p admin/backup/backend/src && echo "fn main() {}" > admin/backup/backend/src/main.rs
COPY internal/anchor-indexer/Cargo.toml ./internal/anchor-indexer/
COPY internal/anchor-wallet/Cargo.toml ./internal/anchor-wallet/
COPY internal/anchor-testnet/Cargo.toml ./internal/anchor-testnet/
COPY libs/rust/anchor-wallet-lib/Cargo.toml ./libs/rust/anchor-wallet-lib/
COPY apps/anchor-threads/backend/Cargo.toml ./apps/anchor-threads/backend/
COPY admin/backup/backend/Cargo.toml ./admin/backup/backend/
COPY apps/anchor-canvas/backend/Cargo.toml ./apps/anchor-canvas/backend/
COPY apps/anchor-places/backend/Cargo.toml ./apps/anchor-places/backend/
COPY apps/anchor-domains/backend/Cargo.toml ./apps/anchor-domains/backend/
COPY apps/anchor-proofs/backend/Cargo.toml ./apps/anchor-proofs/backend/
COPY apps/anchor-tokens/backend/Cargo.toml ./apps/anchor-tokens/backend/
COPY apps/anchor-oracles/backend/Cargo.toml ./apps/anchor-oracles/backend/
COPY apps/anchor-predictions/backend/Cargo.toml ./apps/anchor-predictions/backend/

# Build the dashboard backend
RUN cargo build --release --package dashboard-backend

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies including Docker CLI for compose operations
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    gnupg \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary
COPY --from=builder /app/target/release/dashboard-backend /app/dashboard-backend

# Expose the port
EXPOSE 3011

# Run the binary
CMD ["/app/dashboard-backend"]
