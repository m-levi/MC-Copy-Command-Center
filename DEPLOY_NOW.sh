#!/bin/bash

# ============================================================================
# MARKETING AGENT - ONE-COMMAND DEPLOYMENT
# ============================================================================
# 
# This script will deploy the marketing agent Edge Function
# Run this after: supabase login
#
# Usage: ./DEPLOY_NOW.sh
# ============================================================================

set -e

echo "🚀 Marketing Agent Deployment Starting..."
echo ""

# Configuration
PROJECT_REF="swmijewkwwsbbccfzexe"
FUNCTION_NAME="marketing-agent"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Deploy Function
echo -e "${BLUE}📦 Step 1: Deploying Edge Function...${NC}"
supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Edge Function deployed successfully!${NC}"
    echo ""
else
    echo -e "${RED}❌ Deployment failed. Make sure you're logged in:${NC}"
    echo "   supabase login"
    exit 1
fi

# Step 2: Set Environment Secrets
echo -e "${BLUE}🔐 Step 2: Setting environment secrets...${NC}"
echo ""
echo -e "${YELLOW}Please provide the following API keys:${NC}"
echo ""

# AI Gateway Key
read -p "Enter AI_GATEWAY_API_KEY (or OpenAI key): " AI_KEY
if [ ! -z "$AI_KEY" ]; then
    supabase secrets set AI_GATEWAY_API_KEY="$AI_KEY" --project-ref $PROJECT_REF
    echo -e "${GREEN}✅ AI Gateway key set${NC}"
fi

# Resend Key
read -p "Enter RESEND_API_KEY (for email notifications): " RESEND_KEY
if [ ! -z "$RESEND_KEY" ]; then
    supabase secrets set RESEND_API_KEY="$RESEND_KEY" --project-ref $PROJECT_REF
    echo -e "${GREEN}✅ Resend key set${NC}"
fi

# Set other required secrets automatically
echo ""
echo -e "${BLUE}Setting additional secrets...${NC}"

supabase secrets set SUPABASE_URL="https://swmijewkwwsbbccfzexe.supabase.co" --project-ref $PROJECT_REF
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d '=' -f2)" --project-ref $PROJECT_REF
supabase secrets set EMAIL_FROM="insights@mooncommerce.net" --project-ref $PROJECT_REF
supabase secrets set NEXT_PUBLIC_APP_URL="https://your-app.vercel.app" --project-ref $PROJECT_REF

echo -e "${GREEN}✅ All secrets configured${NC}"
echo ""

# Step 3: Test the deployment
echo -e "${BLUE}🧪 Step 3: Testing deployment...${NC}"
echo ""

BRAND_ID="3ef1be53-2628-4d5e-9e51-96bf97027179"
USER_ID="d2e49c5f-6baa-4d86-b730-d0f84d60057e"
SERVICE_KEY="$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d '=' -f2)"

RESPONSE=$(curl -s -X POST \
  "https://swmijewkwwsbbccfzexe.supabase.co/functions/v1/marketing-agent" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"type\": \"daily\", \"brand_id\": \"$BRAND_ID\", \"user_id\": \"$USER_ID\", \"manual\": true}")

echo "Response: $RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ Test successful! Marketing agent is working!${NC}"
    echo ""
    echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Check your brand's chat for the new conversation"
    echo "2. Go to /settings/agents in your app"
    echo "3. Try the manual trigger buttons"
    echo ""
else
    echo -e "${YELLOW}⚠️  Test returned unexpected response${NC}"
    echo "Check the logs: supabase functions logs marketing-agent --project-ref $PROJECT_REF"
    echo ""
fi

echo -e "${BLUE}📊 View logs:${NC}"
echo "   supabase functions logs marketing-agent --project-ref $PROJECT_REF"
echo ""
echo -e "${BLUE}📝 Database check:${NC}"
echo "   psql \$DATABASE_URL -c \"SELECT * FROM agent_insights ORDER BY started_at DESC LIMIT 5\""
echo ""















