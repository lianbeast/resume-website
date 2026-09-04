#!/usr/bin/env bash
# Lighthouse CI runner for Career-Site
# Usage: ./scripts/run-lhci.sh

set -e

echo "🚀 Starting Lighthouse CI for Career-Site..."

# Check if lhci is installed
if ! command -v lhci &> /dev/null; then
  echo "📦 Installing Lighthouse CI..."
  npm install -g @lhci/cli@0.13.x
fi

# Serve the site locally
echo "🌐 Starting local server on port 8080..."
npx http-server -p 8080 -c-1 &
SERVER_PID=$!

# Give server time to start
sleep 3

# Run Lighthouse CI
echo "🔍 Running Lighthouse CI..."
lhci autorun --config=./lighthouseci.config.js

# Cleanup
echo "🧹 Stopping local server..."
kill $SERVER_PID 2>/dev/null || true

echo "✅ Lighthouse CI complete!"