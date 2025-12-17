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
COPY crates/anchor-wallet ./crates/anchor-wallet
COPY crates/anchor-wallet-lib ./crates/anchor-wallet-lib

# Create dummy files for other workspace members
RUN mkdir -p crates/anchor-indexer/src && echo "fn main() {}" > crates/anchor-indexer/src/main.rs
RUN mkdir -p crates/anchor-testnet/src && echo "fn main() {}" > crates/anchor-testnet/src/main.rs
RUN mkdir -p apps/anchor-threads/backend/src && echo "fn main() {}" > apps/anchor-threads/backend/src/main.rs
RUN mkdir -p anchor/dashboard/backend/src && echo "fn main() {}" > anchor/dashboard/backend/src/main.rs
RUN mkdir -p apps/anchor-pixel/backend/src && echo "fn main() {}" > apps/anchor-pixel/backend/src/main.rs
RUN mkdir -p apps/anchor-map/backend/src && echo "fn main() {}" > apps/anchor-map/backend/src/main.rs
RUN mkdir -p apps/anchor-dns/backend/src && echo "fn main() {}" > apps/anchor-dns/backend/src/main.rs
RUN mkdir -p apps/anchor-proof/backend/src && echo "fn main() {}" > apps/anchor-proof/backend/src/main.rs
COPY crates/anchor-indexer/Cargo.toml ./crates/anchor-indexer/
COPY crates/anchor-testnet/Cargo.toml ./crates/anchor-testnet/
COPY apps/anchor-threads/backend/Cargo.toml ./apps/anchor-threads/backend/
COPY anchor/dashboard/backend/Cargo.toml ./anchor/dashboard/backend/
COPY apps/anchor-pixel/backend/Cargo.toml ./apps/anchor-pixel/backend/
COPY apps/anchor-map/backend/Cargo.toml ./apps/anchor-map/backend/
COPY apps/anchor-dns/backend/Cargo.toml ./apps/anchor-dns/backend/
COPY apps/anchor-proof/backend/Cargo.toml ./apps/anchor-proof/backend/
COPY apps/anchor-tokens/backend/Cargo.toml ./apps/anchor-tokens/backend/

# Build the wallet
RUN cargo build --release -p anchor-wallet

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/anchor-wallet /usr/local/bin/

ENV RUST_LOG=info
ENV PORT=3001

EXPOSE 3001

CMD ["anchor-wallet"]
