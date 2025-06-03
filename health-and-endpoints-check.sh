#!/bin/zsh
# health-and-endpoints-check.sh
# Build, start the server in the background, check health, REST, WebSocket, and auth endpoints, then kill the server.

PORT=3000
SERVER_CMD=(node dist/index.js)

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
  "/"
  "/pets"
  "/pets?status=available"
  "/pets/1"
  "/store/orders"
  "/store/orders/1"
  "/users"
  "/users/login"
  "/users/logout"
  "/users/testuser"
)

for endpoint in "${endpoints[@]}"
do
  echo "\n--- Checking $endpoint ---"
  curl -i http://localhost:$PORT$endpoint || echo "Failed: $endpoint"
done

# WebSocket test
# Requires: wscat (npm install -g wscat)
if command -v wscat >/dev/null 2>&1; then
  echo "\n--- Testing WebSocket Connection ---"
  echo "Attempting to connect to WebSocket at ws://localhost:$PORT/ws"
  
  # Create a temporary file for WebSocket test output
  WS_OUTPUT=$(mktemp)
  
  # Run WebSocket test with a timeout
  (
    # Send a simple ping message
    echo '{"type":"ping","timestamp":'$(date +%s000)'}'
    # Wait for response
    sleep 1
  ) | timeout 5 wscat -c ws://localhost:$PORT/ws 2>&1 | tee "$WS_OUTPUT" || true
  
  # Check if we got any response
  if grep -q "pong" "$WS_OUTPUT"; then
    echo "✅ WebSocket connection successful"
  else
    echo "❌ WebSocket test failed or no response received"
    echo "WebSocket output:"
    cat "$WS_OUTPUT"
  fi
  
  # Clean up
  rm -f "$WS_OUTPUT"
else
  echo "⚠️  wscat not found, skipping WebSocket checks. Install with: npm install -g wscat"
fi

# Kill server
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null
