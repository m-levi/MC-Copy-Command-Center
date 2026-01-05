#!/bin/bash

# Marketing Agent Deployment Script
# This script packages and deploys the Edge Function using Supabase Management API

set -e

PROJECT_REF="swmijewkwwsbbccfzexe"
FUNCTION_NAME="marketing-agent"
FUNCTION_DIR="supabase/functions/marketing-agent"

echo "🚀 Deploying Marketing Agent Edge Function..."
echo "Project: $PROJECT_REF"
echo "Function: $FUNCTION_NAME"
echo ""

# Check if function directory exists
if [ ! -d "$FUNCTION_DIR" ]; then
    echo "❌ Error: Function directory not found: $FUNCTION_DIR"
    exit 1
fi

# Load environment variables
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# Check for service role key
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY not found"
    exit 1
fi

echo "✅ Credentials loaded"
echo ""

# Create a temporary deployment package
TEMP_DIR=$(mktemp -d)
echo "📦 Creating deployment package..."

# Copy function files
cp -r "$FUNCTION_DIR"/* "$TEMP_DIR/"

# Create deployment payload
cd "$TEMP_DIR"

# Use Supabase CLI to deploy
echo "🔄 Deploying via Supabase CLI..."

# Try to deploy using service role key
export SUPABASE_ACCESS_TOKEN="$SUPABASE_SERVICE_ROLE_KEY"

cd "/Users/mordechailevi/Desktop/Manual Library/MoonCommerce/Dev Projects/command_center"

supabase functions deploy "$FUNCTION_NAME" \
    --project-ref "$PROJECT_REF" \
    --no-verify-jwt \
    || {
        echo "⚠️  CLI deployment failed, trying alternative method..."
        
        # Alternative: Use Management API directly
        echo "📡 Using Management API..."
        
        # For now, provide manual instructions
        echo ""
        echo "Please run these commands manually:"
        echo ""
        echo "supabase login"
        echo "supabase functions deploy marketing-agent --project-ref swmijewkwwsbbccfzexe"
        echo ""
        exit 1
    }

# Clean up
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set environment secrets:"
echo "   supabase secrets set AI_GATEWAY_API_KEY=your_key"
echo "   supabase secrets set RESEND_API_KEY=your_key"
echo ""
echo "2. Test the function:"
echo "   curl -X POST https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME \\"
echo "     -H 'Authorization: Bearer \$SUPABASE_SERVICE_ROLE_KEY' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"type\": \"daily\", \"brand_id\": \"3ef1be53-2628-4d5e-9e51-96bf97027179\", \"manual\": true}'"
echo ""















