FROM debian:bookworm-slim

ARG BITCOIN_VERSION=30.0
ARG TARGETPLATFORM
ARG NETWORK=regtest

RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN case ${TARGETPLATFORM} in \
    "linux/amd64") ARCH="x86_64-linux-gnu" ;; \
    "linux/arm64") ARCH="aarch64-linux-gnu" ;; \
    *) ARCH="x86_64-linux-gnu" ;; \
    esac && \
    curl -SLO https://bitcoincore.org/bin/bitcoin-core-${BITCOIN_VERSION}/bitcoin-${BITCOIN_VERSION}-${ARCH}.tar.gz && \
    tar -xzf bitcoin-${BITCOIN_VERSION}-${ARCH}.tar.gz && \
    install -m 0755 -t /usr/local/bin bitcoin-${BITCOIN_VERSION}/bin/* && \
    rm -rf bitcoin-${BITCOIN_VERSION}* && \
    rm -rf /var/lib/apt/lists/*

RUN useradd -r -m -u 1000 bitcoin

USER bitcoin

RUN mkdir -p /home/bitcoin/.bitcoin

COPY --chown=bitcoin:bitcoin bitcoin.conf /home/bitcoin/.bitcoin/bitcoin.conf

# Store network in environment for runtime
ENV BITCOIN_NETWORK=${NETWORK}

EXPOSE 8332 8333 18332 18333 18443 18444 38332 38333 29000 29001 29002

# Use shell form to allow variable expansion
# Note: rpcbind must be passed via command line for Bitcoin Core v30+
CMD bitcoind -${BITCOIN_NETWORK} -rpcbind=0.0.0.0 -rpcallowip=0.0.0.0/0 -printtoconsole
