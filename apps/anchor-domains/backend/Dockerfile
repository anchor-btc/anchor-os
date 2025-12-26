# Build stage
FROM rust:1.87-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace files
COPY Cargo.toml Cargo.lock* ./
COPY libs/rust/anchor-core ./libs/rust/anchor-core
COPY libs/rust/anchor-specs ./libs/rust/anchor-specs
COPY apps/anchor-domains/backend ./apps/anchor-domains/backend

# Create dummy files for other workspace members
RUN mkdir -p internal/anchor-indexer/src && echo "fn main() {}" > internal/anchor-indexer/src/main.rs
RUN mkdir -p internal/anchor-wallet/src && echo "fn main() {}" > internal/anchor-wallet/src/main.rs
RUN mkdir -p internal/anchor-testnet/src && echo "fn main() {}" > internal/anchor-testnet/src/main.rs
RUN mkdir -p libs/rust/anchor-wallet-lib/src && echo "" > libs/rust/anchor-wallet-lib/src/lib.rs
RUN mkdir -p apps/anchor-threads/backend/src && echo "fn main() {}" > apps/anchor-threads/backend/src/main.rs
RUN mkdir -p dashboard/backend/src && echo "fn main() {}" > dashboard/backend/src/main.rs
RUN mkdir -p apps/anchor-canvas/backend/src && echo "fn main() {}" > apps/anchor-canvas/backend/src/main.rs
RUN mkdir -p apps/anchor-places/backend/src && echo "fn main() {}" > apps/anchor-places/backend/src/main.rs
RUN mkdir -p apps/anchor-proofs/backend/src && echo "fn main() {}" > apps/anchor-proofs/backend/src/main.rs
RUN mkdir -p apps/anchor-tokens/backend/src && echo "fn main() {}" > apps/anchor-tokens/backend/src/main.rs
RUN mkdir -p apps/anchor-oracles/backend/src && echo "fn main() {}" > apps/anchor-oracles/backend/src/main.rs
RUN mkdir -p apps/anchor-predictions/backend/src && echo "fn main() {}" > apps/anchor-predictions/backend/src/main.rs
COPY internal/anchor-indexer/Cargo.toml ./internal/anchor-indexer/
COPY internal/anchor-wallet/Cargo.toml ./internal/anchor-wallet/
COPY internal/anchor-testnet/Cargo.toml ./internal/anchor-testnet/
COPY libs/rust/anchor-wallet-lib/Cargo.toml ./libs/rust/anchor-wallet-lib/
COPY apps/anchor-threads/backend/Cargo.toml ./apps/anchor-threads/backend/
COPY dashboard/backend/Cargo.toml ./dashboard/backend/
COPY apps/anchor-canvas/backend/Cargo.toml ./apps/anchor-canvas/backend/
COPY apps/anchor-places/backend/Cargo.toml ./apps/anchor-places/backend/
COPY apps/anchor-proofs/backend/Cargo.toml ./apps/anchor-proofs/backend/
COPY apps/anchor-tokens/backend/Cargo.toml ./apps/anchor-tokens/backend/
COPY apps/anchor-oracles/backend/Cargo.toml ./apps/anchor-oracles/backend/
COPY apps/anchor-predictions/backend/Cargo.toml ./apps/anchor-predictions/backend/

# Build the application
RUN cargo build --release --package anchor-domains-backend

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
COPY --from=builder /app/target/release/anchor-domains-backend /app/anchor-domains-backend

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=3006
ENV RUST_LOG=anchor_domains_backend=info

EXPOSE 3006

CMD ["/app/anchor-domains-backend"]
