#!/bin/bash

echo "Waiting for server to start..."
sleep 30

echo "Creating test case..."
curl -X POST http://localhost:3001/api/cases \
  -H "Content-Type: application/json" \
  -d '{
    "processId": 1,
    "title": "Debug Test for Date Issue",
    "goalDateUtc": "2025-12-31",
    "createdBy": 1
  }' \
  -o response.json

echo ""
echo "Response saved to response.json"
cat response.json | python3 -m json.tool | head -50