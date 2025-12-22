# Build stage
FROM rust:1.87-slim-bookworm AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace files
COPY Cargo.toml Cargo.lock* ./
COPY libs/rust/anchor-core ./libs/rust/anchor-core
COPY libs/rust/anchor-specs ./libs/rust/anchor-specs
COPY internal/anchor-testnet ./internal/anchor-testnet

# Create dummy files for other workspace members
RUN mkdir -p internal/anchor-indexer/src && echo "fn main() {}" > internal/anchor-indexer/src/main.rs
RUN mkdir -p internal/anchor-wallet/src && echo "fn main() {}" > internal/anchor-wallet/src/main.rs
RUN mkdir -p libs/rust/anchor-wallet-lib/src && echo "" > libs/rust/anchor-wallet-lib/src/lib.rs
RUN mkdir -p apps/anchor-threads/backend/src && echo "fn main() {}" > apps/anchor-threads/backend/src/main.rs
RUN mkdir -p anchor/dashboard/backend/src && echo "fn main() {}" > anchor/dashboard/backend/src/main.rs
RUN mkdir -p apps/anchor-canvas/backend/src && echo "fn main() {}" > apps/anchor-canvas/backend/src/main.rs
RUN mkdir -p apps/anchor-places/backend/src && echo "fn main() {}" > apps/anchor-places/backend/src/main.rs
RUN mkdir -p apps/anchor-domains/backend/src && echo "fn main() {}" > apps/anchor-domains/backend/src/main.rs
RUN mkdir -p apps/anchor-proofs/backend/src && echo "fn main() {}" > apps/anchor-proofs/backend/src/main.rs
RUN mkdir -p apps/anchor-tokens/backend/src && echo "fn main() {}" > apps/anchor-tokens/backend/src/main.rs
RUN mkdir -p apps/anchor-oracles/backend/src && echo "fn main() {}" > apps/anchor-oracles/backend/src/main.rs
RUN mkdir -p apps/anchor-predictions/backend/src && echo "fn main() {}" > apps/anchor-predictions/backend/src/main.rs
RUN mkdir -p anchor/backup/backend/src && echo "fn main() {}" > anchor/backup/backend/src/main.rs
COPY internal/anchor-indexer/Cargo.toml ./internal/anchor-indexer/
COPY internal/anchor-wallet/Cargo.toml ./internal/anchor-wallet/
COPY libs/rust/anchor-wallet-lib/Cargo.toml ./libs/rust/anchor-wallet-lib/
COPY apps/anchor-threads/backend/Cargo.toml ./apps/anchor-threads/backend/
COPY anchor/dashboard/backend/Cargo.toml ./anchor/dashboard/backend/
COPY anchor/backup/backend/Cargo.toml ./anchor/backup/backend/
COPY apps/anchor-canvas/backend/Cargo.toml ./apps/anchor-canvas/backend/
COPY apps/anchor-places/backend/Cargo.toml ./apps/anchor-places/backend/
COPY apps/anchor-domains/backend/Cargo.toml ./apps/anchor-domains/backend/
COPY apps/anchor-proofs/backend/Cargo.toml ./apps/anchor-proofs/backend/
COPY apps/anchor-tokens/backend/Cargo.toml ./apps/anchor-tokens/backend/
COPY apps/anchor-oracles/backend/Cargo.toml ./apps/anchor-oracles/backend/
COPY apps/anchor-predictions/backend/Cargo.toml ./apps/anchor-predictions/backend/

# Build the testnet service
RUN cargo build --release -p anchor-testnet

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/anchor-testnet /usr/local/bin/

ENV RUST_LOG=info
ENV WALLET_URL=http://infra-wallet:3001
ENV API_PORT=3014
ENV MIN_INTERVAL_SECS=3
ENV MAX_INTERVAL_SECS=10
ENV BLOCKS_PER_CYCLE=1
ENV INITIAL_BLOCKS=101

EXPOSE 3014

CMD ["anchor-testnet"]
