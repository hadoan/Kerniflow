# Stream Debugging Checklist

## Steps to debug the streaming issue:

### 1. Check Browser Console

Open the browser console and look for:

- Any JavaScript errors
- Network errors
- Failed fetch requests

### 2. Check Network Tab

In the browser DevTools Network tab:

- Find the `/copilot/chat` request
- Check the Response Headers - should include:
  - `Content-Type: text/event-stream` or similar
  - `x-vercel-ai-ui-message-stream: v1`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
- Check the Response body - should show the streaming data
- Check the Status code - should be 200

### 3. Check CORS

Ensure CORS headers are set:

- `Access-Control-Allow-Origin: *` (or specific origin)
- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-Tenant-Id, X-Idempotency-Key`

### 4. Verify useChat Configuration

Check if `useChatOptions` needs additional configuration like:

- `streamProtocol: 'data'`
- `onError` callback to catch errors
- `onResponse` callback to debug responses

### 5. Check API Response Format

The stream should send:

- `data: {"type":"start"}`
- `data: {"type":"text-delta","id":"0","delta":"..."}`
- `data: {"type":"finish","finishReason":"..."}`
- `data: [DONE]`

### 6. Test with curl

```bash
curl -X POST http://localhost:3000/copilot/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-Id: YOUR_TENANT" \
  -H "X-Idempotency-Key: test-123" \
  -d '{"messages":[{"role":"user","content":"hello"}]}'
```
