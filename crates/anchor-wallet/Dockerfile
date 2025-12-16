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
RUN mkdir -p explorer/backend/src && echo "fn main() {}" > explorer/backend/src/main.rs
RUN mkdir -p apps/pixelmap/backend/src && echo "fn main() {}" > apps/pixelmap/backend/src/main.rs
RUN mkdir -p apps/anchormap/backend/src && echo "fn main() {}" > apps/anchormap/backend/src/main.rs
RUN mkdir -p apps/bitdns/backend/src && echo "fn main() {}" > apps/bitdns/backend/src/main.rs
RUN mkdir -p apps/anchorproof/backend/src && echo "fn main() {}" > apps/anchorproof/backend/src/main.rs
RUN mkdir -p dashboard/backend/src && echo "fn main() {}" > dashboard/backend/src/main.rs
COPY crates/anchor-indexer/Cargo.toml ./crates/anchor-indexer/
COPY crates/anchor-testnet/Cargo.toml ./crates/anchor-testnet/
COPY explorer/backend/Cargo.toml ./explorer/backend/
COPY apps/pixelmap/backend/Cargo.toml ./apps/pixelmap/backend/
COPY apps/anchormap/backend/Cargo.toml ./apps/anchormap/backend/
COPY apps/bitdns/backend/Cargo.toml ./apps/bitdns/backend/
COPY apps/anchorproof/backend/Cargo.toml ./apps/anchorproof/backend/
COPY dashboard/backend/Cargo.toml ./dashboard/backend/

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

