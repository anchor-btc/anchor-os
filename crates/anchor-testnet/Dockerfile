# Build stage
FROM rust:1.87-slim-bookworm AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace files
COPY Cargo.toml Cargo.lock* ./
COPY crates/anchor-core ./crates/anchor-core
COPY crates/anchor-testnet ./crates/anchor-testnet

# Create dummy files for other workspace members
RUN mkdir -p crates/anchor-indexer/src && echo "fn main() {}" > crates/anchor-indexer/src/main.rs
RUN mkdir -p crates/anchor-wallet/src && echo "fn main() {}" > crates/anchor-wallet/src/main.rs
RUN mkdir -p crates/anchor-wallet-lib/src && echo "" > crates/anchor-wallet-lib/src/lib.rs
RUN mkdir -p explorer/backend/src && echo "fn main() {}" > explorer/backend/src/main.rs
RUN mkdir -p apps/pixelmap/backend/src && echo "fn main() {}" > apps/pixelmap/backend/src/main.rs
RUN mkdir -p apps/anchormap/backend/src && echo "fn main() {}" > apps/anchormap/backend/src/main.rs
RUN mkdir -p dashboard/backend/src && echo "fn main() {}" > dashboard/backend/src/main.rs
COPY crates/anchor-indexer/Cargo.toml ./crates/anchor-indexer/
COPY crates/anchor-wallet/Cargo.toml ./crates/anchor-wallet/
COPY crates/anchor-wallet-lib/Cargo.toml ./crates/anchor-wallet-lib/
COPY explorer/backend/Cargo.toml ./explorer/backend/
COPY apps/pixelmap/backend/Cargo.toml ./apps/pixelmap/backend/
COPY apps/anchormap/backend/Cargo.toml ./apps/anchormap/backend/
COPY dashboard/backend/Cargo.toml ./dashboard/backend/

# Build the testnet service
RUN cargo build --release -p anchor-testnet

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/anchor-testnet /usr/local/bin/

ENV RUST_LOG=info
ENV WALLET_URL=http://wallet:3001
ENV MIN_INTERVAL_SECS=3
ENV MAX_INTERVAL_SECS=10
ENV BLOCKS_PER_CYCLE=1
ENV INITIAL_BLOCKS=101

CMD ["anchor-testnet"]

