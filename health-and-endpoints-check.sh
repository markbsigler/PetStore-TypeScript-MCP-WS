#!/bin/zsh
# health-and-endpoints-check.sh
# Build, start the server in the background, check health, REST, WebSocket, and auth endpoints, then kill the server.

PORT=3000
SERVER_CMD=(node --loader ts-node/esm src/index.ts)

# Build
npm run build || exit 1

# Start server in background
$SERVER_CMD &
SERVER_PID=$!

# Wait for server to start
sleep 3

# List of REST endpoints to check
endpoints=(
  "/health"
  "/metrics"
  "/" # root
  "/pets"
  "/pets/findByStatus"
  "/pets/findByTags"
  "/pet/1"
  "/pet/1/uploadImage"
  "/store/inventory"
  "/store/order"
  "/store/order/1"
  "/user"
  "/user/createWithArray"
  "/user/createWithList"
  "/user/login"
  "/user/logout"
  "/user/testuser"
)

for endpoint in "${endpoints[@]}"
do
  echo "\n--- Checking $endpoint ---"
  curl -i http://localhost:$PORT$endpoint || echo "Failed: $endpoint"
done

# WebSocket check (basic connect, auth, and ping)
# Requires: wscat (npm install -g wscat)
if command -v wscat >/dev/null 2>&1; then
  echo "\n--- WebSocket: Connect, Auth, and Ping ---"
  (
    sleep 1
    echo '{"type":"request","correlationId":"test-auth-1","timestamp":'$(date +%s000)',"action":"authenticate","payload":{"token":"dummy-token"}}'
    sleep 1
    echo '{"type":"request","correlationId":"test-ping-1","timestamp":'$(date +%s000)',"action":"ping","payload":{}}'
    sleep 1
  ) | wscat -c ws://localhost:$PORT/ws || echo "WebSocket test failed"
else
  echo "wscat not found, skipping WebSocket checks. Install with: npm install -g wscat"
fi

# Kill server
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null
