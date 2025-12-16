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
COPY explorer/backend ./explorer/backend

# Create dummy files for other workspace members
RUN mkdir -p crates/anchor-indexer/src && echo "fn main() {}" > crates/anchor-indexer/src/main.rs
RUN mkdir -p crates/anchor-wallet/src && echo "fn main() {}" > crates/anchor-wallet/src/main.rs
RUN mkdir -p crates/anchor-testnet/src && echo "fn main() {}" > crates/anchor-testnet/src/main.rs
RUN mkdir -p crates/anchor-wallet-lib/src && echo "" > crates/anchor-wallet-lib/src/lib.rs
RUN mkdir -p apps/pixelmap/backend/src && echo "fn main() {}" > apps/pixelmap/backend/src/main.rs
RUN mkdir -p apps/anchormap/backend/src && echo "fn main() {}" > apps/anchormap/backend/src/main.rs
RUN mkdir -p apps/bitdns/backend/src && echo "fn main() {}" > apps/bitdns/backend/src/main.rs
RUN mkdir -p apps/anchorproof/backend/src && echo "fn main() {}" > apps/anchorproof/backend/src/main.rs
RUN mkdir -p dashboard/backend/src && echo "fn main() {}" > dashboard/backend/src/main.rs
COPY crates/anchor-indexer/Cargo.toml ./crates/anchor-indexer/
COPY crates/anchor-wallet/Cargo.toml ./crates/anchor-wallet/
COPY crates/anchor-testnet/Cargo.toml ./crates/anchor-testnet/
COPY crates/anchor-wallet-lib/Cargo.toml ./crates/anchor-wallet-lib/
COPY apps/pixelmap/backend/Cargo.toml ./apps/pixelmap/backend/
COPY apps/anchormap/backend/Cargo.toml ./apps/anchormap/backend/
COPY apps/bitdns/backend/Cargo.toml ./apps/bitdns/backend/
COPY apps/anchorproof/backend/Cargo.toml ./apps/anchorproof/backend/
COPY dashboard/backend/Cargo.toml ./dashboard/backend/

# Build the explorer backend
RUN cargo build --release -p explorer-backend

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/explorer-backend /usr/local/bin/

ENV RUST_LOG=info
ENV PORT=3002

EXPOSE 3002

CMD ["explorer-backend"]

