#!/bin/bash

# Generate self-signed certificate for localhost
echo "🔐 Generating self-signed SSL certificate for localhost..."

# Create certs directory if it doesn't exist
mkdir -p .certs

# Generate certificate
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' \
  -keyout .certs/localhost-key.pem \
  -out .certs/localhost.pem \
  -days 365

echo "✅ Certificate generated in .certs/"
echo ""
echo "To use HTTPS:"
echo "1. Run: npm run dev:https"
echo "2. Open: https://localhost:3000"
echo "3. Click 'Advanced' → 'Proceed to localhost' (it's safe, it's your own cert)"
echo ""
echo "Note: You'll see a security warning - this is normal for self-signed certs."

