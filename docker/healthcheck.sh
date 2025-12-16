#!/bin/sh
# ============================================================================
# Generic healthcheck script for Docker containers
# ============================================================================
# Usage: docker/healthcheck.sh [port] [path]
# Example: docker/healthcheck.sh 3000 /health

PORT=${1:-3000}
PATH=${2:-/health}

# Try to curl the healthcheck endpoint
curl -f -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}${PATH}

# Exit with status based on HTTP code
if [ $? -eq 0 ]; then
  exit 0
else
  exit 1
fi
