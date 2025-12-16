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
COPY Cargo.toml Cargo.lock ./
COPY crates/anchor-core ./crates/anchor-core
COPY apps/pixelmap/backend ./apps/pixelmap/backend

# Create dummy files for other workspace members
RUN mkdir -p crates/anchor-indexer/src && echo "fn main() {}" > crates/anchor-indexer/src/main.rs
RUN mkdir -p crates/anchor-wallet/src && echo "fn main() {}" > crates/anchor-wallet/src/main.rs
RUN mkdir -p crates/anchor-testnet/src && echo "fn main() {}" > crates/anchor-testnet/src/main.rs
RUN mkdir -p crates/anchor-wallet-lib/src && echo "" > crates/anchor-wallet-lib/src/lib.rs
RUN mkdir -p explorer/backend/src && echo "fn main() {}" > explorer/backend/src/main.rs
RUN mkdir -p apps/anchormap/backend/src && echo "fn main() {}" > apps/anchormap/backend/src/main.rs
RUN mkdir -p dashboard/backend/src && echo "fn main() {}" > dashboard/backend/src/main.rs
COPY crates/anchor-indexer/Cargo.toml ./crates/anchor-indexer/
COPY crates/anchor-wallet/Cargo.toml ./crates/anchor-wallet/
COPY crates/anchor-testnet/Cargo.toml ./crates/anchor-testnet/
COPY crates/anchor-wallet-lib/Cargo.toml ./crates/anchor-wallet-lib/
COPY explorer/backend/Cargo.toml ./explorer/backend/
COPY apps/anchormap/backend/Cargo.toml ./apps/anchormap/backend/
COPY dashboard/backend/Cargo.toml ./dashboard/backend/

# Build the application
RUN cargo build --release -p pixelmap-backend

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
COPY --from=builder /app/target/release/pixelmap-backend /app/pixelmap-backend

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=3003
ENV RUST_LOG=pixelmap_backend=info

EXPOSE 3003

CMD ["/app/pixelmap-backend"]
