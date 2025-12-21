# Build stage
FROM rust:1.87-slim-bookworm AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace files
COPY Cargo.toml Cargo.lock* ./
COPY crates/anchor-core ./crates/anchor-core

# Create dummy files for other workspace members
RUN mkdir -p crates/anchor-indexer/src && echo "fn main() {}" > crates/anchor-indexer/src/main.rs
RUN mkdir -p crates/anchor-wallet/src && echo "fn main() {}" > crates/anchor-wallet/src/main.rs
RUN mkdir -p crates/anchor-wallet-lib/src && echo "" > crates/anchor-wallet-lib/src/lib.rs
RUN mkdir -p crates/anchor-testnet/src && echo "fn main() {}" > crates/anchor-testnet/src/main.rs
RUN mkdir -p apps/anchor-threads/backend/src && echo "fn main() {}" > apps/anchor-threads/backend/src/main.rs
RUN mkdir -p apps/anchor-canvas/backend/src && echo "fn main() {}" > apps/anchor-canvas/backend/src/main.rs
RUN mkdir -p apps/anchor-map/backend/src && echo "fn main() {}" > apps/anchor-map/backend/src/main.rs
RUN mkdir -p apps/anchor-dns/backend/src && echo "fn main() {}" > apps/anchor-dns/backend/src/main.rs
RUN mkdir -p apps/anchor-proofs/backend/src && echo "fn main() {}" > apps/anchor-proofs/backend/src/main.rs
RUN mkdir -p apps/anchor-tokens/backend/src && echo "fn main() {}" > apps/anchor-tokens/backend/src/main.rs
RUN mkdir -p apps/anchor-oracles/backend/src && echo "fn main() {}" > apps/anchor-oracles/backend/src/main.rs
RUN mkdir -p apps/anchor-lottery/backend/src && echo "fn main() {}" > apps/anchor-lottery/backend/src/main.rs
RUN mkdir -p anchor/dashboard/backend/src && echo "fn main() {}" > anchor/dashboard/backend/src/main.rs

COPY crates/anchor-indexer/Cargo.toml ./crates/anchor-indexer/
COPY crates/anchor-wallet/Cargo.toml ./crates/anchor-wallet/
COPY crates/anchor-wallet-lib/Cargo.toml ./crates/anchor-wallet-lib/
COPY crates/anchor-testnet/Cargo.toml ./crates/anchor-testnet/
COPY apps/anchor-threads/backend/Cargo.toml ./apps/anchor-threads/backend/
COPY apps/anchor-canvas/backend/Cargo.toml ./apps/anchor-canvas/backend/
COPY apps/anchor-map/backend/Cargo.toml ./apps/anchor-map/backend/
COPY apps/anchor-dns/backend/Cargo.toml ./apps/anchor-dns/backend/
COPY apps/anchor-proofs/backend/Cargo.toml ./apps/anchor-proofs/backend/
COPY apps/anchor-tokens/backend/Cargo.toml ./apps/anchor-tokens/backend/
COPY apps/anchor-oracles/backend/Cargo.toml ./apps/anchor-oracles/backend/
COPY apps/anchor-lottery/backend/Cargo.toml ./apps/anchor-lottery/backend/
COPY anchor/dashboard/backend/Cargo.toml ./anchor/dashboard/backend/

# Copy backup service
COPY anchor/backup/backend ./anchor/backup/backend

# Build the backup service
RUN cargo build --release --package anchor-backup

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies, restic, and Docker CLI
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    restic \
    postgresql-client \
    mariadb-client \
    cifs-utils \
    gnupg \
    lsb-release \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# Copy binary
COPY --from=builder /app/target/release/anchor-backup /usr/local/bin/

# Create backup directory
RUN mkdir -p /backups

ENV RUST_LOG=info
ENV PORT=8003
ENV BACKUP_DIR=/backups

EXPOSE 8003

CMD ["anchor-backup"]
