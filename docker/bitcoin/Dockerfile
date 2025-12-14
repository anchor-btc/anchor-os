FROM debian:bookworm-slim

ARG BITCOIN_VERSION=27.0
ARG TARGETPLATFORM

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

EXPOSE 18443 18444

CMD ["bitcoind", "-regtest", "-printtoconsole"]

