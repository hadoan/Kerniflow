#!/bin/bash

# Test the streaming endpoint
# Replace these variables with your actual values

API_URL="http://localhost:3000/copilot/chat"
TENANT_ID="your-tenant-id"
ACCESS_TOKEN="your-access-token"

echo "Testing streaming endpoint..."
echo ""

curl -N -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "X-Idempotency-Key: test-$(date +%s)" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Say hello"
      }
    ]
  }'

echo ""
echo "Test complete"
