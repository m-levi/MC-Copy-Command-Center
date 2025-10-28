#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}   API Keys Testing Script${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Load .env.local
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
else
    echo -e "${RED}✗ .env.local file not found${NC}"
    exit 1
fi

# Test Anthropic API Key
echo -e "${YELLOW}Testing Anthropic API Key...${NC}"
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}✗ ANTHROPIC_API_KEY is not set${NC}"
else
    response=$(curl -s -w "\n%{http_code}" https://api.anthropic.com/v1/messages \
      --header "x-api-key: $ANTHROPIC_API_KEY" \
      --header "anthropic-version: 2023-06-01" \
      --header "content-type: application/json" \
      --data '{
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 10,
        "messages": [{"role": "user", "content": "Hi"}]
      }')
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ Anthropic API Key is valid${NC}"
        echo -e "${GREEN}  Model: claude-sonnet-4-20250514 is accessible${NC}"
    elif [ "$http_code" = "401" ]; then
        echo -e "${RED}✗ Anthropic API Key is invalid or expired${NC}"
        echo -e "${YELLOW}  Error: Authentication failed${NC}"
        echo -e "${YELLOW}  Please get a new key from: https://console.anthropic.com/${NC}"
    elif [ "$http_code" = "429" ]; then
        echo -e "${YELLOW}⚠ Anthropic API Key is valid but rate limited${NC}"
        echo -e "${YELLOW}  You may need to upgrade your plan or wait${NC}"
    else
        echo -e "${RED}✗ Unexpected response (HTTP $http_code)${NC}"
        echo -e "${YELLOW}  Response: $body${NC}"
    fi
fi

echo ""

# Test OpenAI API Key
echo -e "${YELLOW}Testing OpenAI API Key...${NC}"
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}⚠ OPENAI_API_KEY is not set (optional)${NC}"
    echo -e "${YELLOW}  OpenAI is used for embeddings in RAG functionality${NC}"
else
    response=$(curl -s -w "\n%{http_code}" https://api.openai.com/v1/models \
      --header "Authorization: Bearer $OPENAI_API_KEY")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ OpenAI API Key is valid${NC}"
        # Check if embedding model is available
        if echo "$body" | grep -q "text-embedding-3-small"; then
            echo -e "${GREEN}  text-embedding-3-small model is accessible${NC}"
        else
            echo -e "${YELLOW}  Note: text-embedding-3-small model not found in response${NC}"
        fi
    elif [ "$http_code" = "401" ]; then
        echo -e "${RED}✗ OpenAI API Key is invalid or expired${NC}"
        echo -e "${YELLOW}  Error: Authentication failed${NC}"
        echo -e "${YELLOW}  Please get a new key from: https://platform.openai.com/api-keys${NC}"
    elif [ "$http_code" = "429" ]; then
        echo -e "${YELLOW}⚠ OpenAI API Key is valid but rate limited${NC}"
        echo -e "${YELLOW}  You may need to upgrade your plan or wait${NC}"
    else
        echo -e "${RED}✗ Unexpected response (HTTP $http_code)${NC}"
        echo -e "${YELLOW}  Response: $body${NC}"
    fi
fi

echo ""

# Test Supabase Connection
echo -e "${YELLOW}Testing Supabase Connection...${NC}"
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_URL is not set${NC}"
else
    response=$(curl -s -w "\n%{http_code}" -I "$NEXT_PUBLIC_SUPABASE_URL")
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "404" ]; then
        echo -e "${GREEN}✓ Supabase URL is reachable${NC}"
        echo -e "${GREEN}  URL: $NEXT_PUBLIC_SUPABASE_URL${NC}"
    else
        echo -e "${RED}✗ Cannot reach Supabase URL (HTTP $http_code)${NC}"
        echo -e "${YELLOW}  Check your NEXT_PUBLIC_SUPABASE_URL value${NC}"
    fi
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set${NC}"
else
    echo -e "${GREEN}✓ Supabase Anon Key is set${NC}"
fi

echo ""
echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}   Summary${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""
echo -e "If all tests show ${GREEN}✓${NC}, your API keys are working!"
echo -e "If any tests show ${RED}✗${NC}, follow the instructions above to fix."
echo ""

