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
COPY libs/rust/anchor-core ./libs/rust/anchor-core
COPY libs/rust/anchor-specs ./libs/rust/anchor-specs

# Create dummy files for other workspace members
RUN mkdir -p internal/anchor-indexer/src && echo "fn main() {}" > internal/anchor-indexer/src/main.rs
RUN mkdir -p internal/anchor-wallet/src && echo "fn main() {}" > internal/anchor-wallet/src/main.rs
RUN mkdir -p libs/rust/anchor-wallet-lib/src && echo "" > libs/rust/anchor-wallet-lib/src/lib.rs
RUN mkdir -p internal/anchor-testnet/src && echo "fn main() {}" > internal/anchor-testnet/src/main.rs
RUN mkdir -p apps/anchor-threads/backend/src && echo "fn main() {}" > apps/anchor-threads/backend/src/main.rs
RUN mkdir -p apps/anchor-canvas/backend/src && echo "fn main() {}" > apps/anchor-canvas/backend/src/main.rs
RUN mkdir -p apps/anchor-places/backend/src && echo "fn main() {}" > apps/anchor-places/backend/src/main.rs
RUN mkdir -p apps/anchor-domains/backend/src && echo "fn main() {}" > apps/anchor-domains/backend/src/main.rs
RUN mkdir -p apps/anchor-proofs/backend/src && echo "fn main() {}" > apps/anchor-proofs/backend/src/main.rs
RUN mkdir -p apps/anchor-tokens/backend/src && echo "fn main() {}" > apps/anchor-tokens/backend/src/main.rs
RUN mkdir -p apps/anchor-oracles/backend/src && echo "fn main() {}" > apps/anchor-oracles/backend/src/main.rs
RUN mkdir -p apps/anchor-predictions/backend/src && echo "fn main() {}" > apps/anchor-predictions/backend/src/main.rs
RUN mkdir -p admin/dashboard/backend/src && echo "fn main() {}" > admin/dashboard/backend/src/main.rs

COPY internal/anchor-indexer/Cargo.toml ./internal/anchor-indexer/
COPY internal/anchor-wallet/Cargo.toml ./internal/anchor-wallet/
COPY libs/rust/anchor-wallet-lib/Cargo.toml ./libs/rust/anchor-wallet-lib/
COPY internal/anchor-testnet/Cargo.toml ./internal/anchor-testnet/
COPY apps/anchor-threads/backend/Cargo.toml ./apps/anchor-threads/backend/
COPY apps/anchor-canvas/backend/Cargo.toml ./apps/anchor-canvas/backend/
COPY apps/anchor-places/backend/Cargo.toml ./apps/anchor-places/backend/
COPY apps/anchor-domains/backend/Cargo.toml ./apps/anchor-domains/backend/
COPY apps/anchor-proofs/backend/Cargo.toml ./apps/anchor-proofs/backend/
COPY apps/anchor-tokens/backend/Cargo.toml ./apps/anchor-tokens/backend/
COPY apps/anchor-oracles/backend/Cargo.toml ./apps/anchor-oracles/backend/
COPY apps/anchor-predictions/backend/Cargo.toml ./apps/anchor-predictions/backend/
COPY admin/dashboard/backend/Cargo.toml ./admin/dashboard/backend/

# Copy backup service
COPY admin/backup/backend ./admin/backup/backend

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
