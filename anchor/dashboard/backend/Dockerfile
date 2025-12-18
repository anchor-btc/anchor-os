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
COPY crates/anchor-core ./crates/anchor-core
COPY anchor/dashboard/backend ./anchor/dashboard/backend

# Create dummy files for other workspace members
RUN mkdir -p crates/anchor-indexer/src && echo "fn main() {}" > crates/anchor-indexer/src/main.rs
RUN mkdir -p crates/anchor-wallet/src && echo "fn main() {}" > crates/anchor-wallet/src/main.rs
RUN mkdir -p crates/anchor-testnet/src && echo "fn main() {}" > crates/anchor-testnet/src/main.rs
RUN mkdir -p crates/anchor-wallet-lib/src && echo "" > crates/anchor-wallet-lib/src/lib.rs
RUN mkdir -p apps/anchor-threads/backend/src && echo "fn main() {}" > apps/anchor-threads/backend/src/main.rs
RUN mkdir -p apps/anchor-pixel/backend/src && echo "fn main() {}" > apps/anchor-pixel/backend/src/main.rs
RUN mkdir -p apps/anchor-map/backend/src && echo "fn main() {}" > apps/anchor-map/backend/src/main.rs
RUN mkdir -p apps/anchor-dns/backend/src && echo "fn main() {}" > apps/anchor-dns/backend/src/main.rs
RUN mkdir -p apps/anchor-proof/backend/src && echo "fn main() {}" > apps/anchor-proof/backend/src/main.rs
RUN mkdir -p apps/anchor-tokens/backend/src && echo "fn main() {}" > apps/anchor-tokens/backend/src/main.rs
RUN mkdir -p apps/anchor-oracles/backend/src && echo "fn main() {}" > apps/anchor-oracles/backend/src/main.rs
RUN mkdir -p apps/anchor-lottery/backend/src && echo "fn main() {}" > apps/anchor-lottery/backend/src/main.rs
RUN mkdir -p anchor/backup/backend/src && echo "fn main() {}" > anchor/backup/backend/src/main.rs
COPY crates/anchor-indexer/Cargo.toml ./crates/anchor-indexer/
COPY crates/anchor-wallet/Cargo.toml ./crates/anchor-wallet/
COPY crates/anchor-testnet/Cargo.toml ./crates/anchor-testnet/
COPY crates/anchor-wallet-lib/Cargo.toml ./crates/anchor-wallet-lib/
COPY apps/anchor-threads/backend/Cargo.toml ./apps/anchor-threads/backend/
COPY anchor/backup/backend/Cargo.toml ./anchor/backup/backend/
COPY apps/anchor-pixel/backend/Cargo.toml ./apps/anchor-pixel/backend/
COPY apps/anchor-map/backend/Cargo.toml ./apps/anchor-map/backend/
COPY apps/anchor-dns/backend/Cargo.toml ./apps/anchor-dns/backend/
COPY apps/anchor-proof/backend/Cargo.toml ./apps/anchor-proof/backend/
COPY apps/anchor-tokens/backend/Cargo.toml ./apps/anchor-tokens/backend/
COPY apps/anchor-oracles/backend/Cargo.toml ./apps/anchor-oracles/backend/
COPY apps/anchor-lottery/backend/Cargo.toml ./apps/anchor-lottery/backend/

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
