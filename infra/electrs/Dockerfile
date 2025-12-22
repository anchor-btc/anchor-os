# Electrs Dockerfile with proper environment variable handling
FROM getumbrel/electrs:v0.10.9

# Create entrypoint script that handles RPC auth via cookie file
USER root
RUN echo '#!/bin/sh\n\
set -e\n\
\n\
# Create cookie file from ELECTRS_AUTH if provided (no newline at end)\n\
if [ -n "$ELECTRS_AUTH" ]; then\n\
    mkdir -p /data/.cookie\n\
    printf "%s" "$ELECTRS_AUTH" > /data/.cookie/cookie\n\
    COOKIE_ARG="--cookie-file=/data/.cookie/cookie"\n\
    echo "Cookie file created with content: $(cat /data/.cookie/cookie)"\n\
else\n\
    COOKIE_ARG=""\n\
fi\n\
\n\
# Build command with environment variables\n\
ARGS=""\n\
\n\
if [ -n "$ELECTRS_NETWORK" ]; then\n\
    ARGS="$ARGS --network=$ELECTRS_NETWORK"\n\
fi\n\
\n\
if [ -n "$ELECTRS_DAEMON_RPC_ADDR" ]; then\n\
    ARGS="$ARGS --daemon-rpc-addr=$ELECTRS_DAEMON_RPC_ADDR"\n\
fi\n\
\n\
if [ -n "$ELECTRS_DAEMON_P2P_ADDR" ]; then\n\
    ARGS="$ARGS --daemon-p2p-addr=$ELECTRS_DAEMON_P2P_ADDR"\n\
fi\n\
\n\
if [ -n "$ELECTRS_ELECTRUM_RPC_ADDR" ]; then\n\
    ARGS="$ARGS --electrum-rpc-addr=$ELECTRS_ELECTRUM_RPC_ADDR"\n\
fi\n\
\n\
if [ -n "$ELECTRS_DB_DIR" ]; then\n\
    ARGS="$ARGS --db-dir=$ELECTRS_DB_DIR"\n\
fi\n\
\n\
echo "Starting electrs with args: $ARGS $COOKIE_ARG"\n\
exec electrs $ARGS $COOKIE_ARG\n\
' > /entrypoint.sh && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
