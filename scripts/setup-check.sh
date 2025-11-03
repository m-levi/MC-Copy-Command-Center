#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}   Command Center Setup Verification${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Check if .env.local exists
echo -e "${YELLOW}Checking environment file...${NC}"
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓ .env.local file exists${NC}"
    
    # Check if required environment variables are set
    if grep -q "NEXT_PUBLIC_SUPABASE_URL=" .env.local && \
       grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local && \
       grep -q "ANTHROPIC_API_KEY=" .env.local; then
        echo -e "${GREEN}✓ Required environment variables are present${NC}"
    else
        echo -e "${RED}✗ Some required environment variables are missing${NC}"
        echo -e "${YELLOW}  Please add: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY${NC}"
    fi
else
    echo -e "${RED}✗ .env.local file not found${NC}"
    echo -e "${YELLOW}  Creating template from env.example...${NC}"
    cp env.example .env.local
    echo -e "${YELLOW}  Please edit .env.local with your actual credentials${NC}"
fi

echo ""

# Check if .env.local is in .gitignore
echo -e "${YELLOW}Checking git security...${NC}"
if grep -q "\.env\.local" .gitignore 2>/dev/null; then
    echo -e "${GREEN}✓ .env.local is in .gitignore (secure)${NC}"
else
    echo -e "${RED}✗ .env.local is NOT in .gitignore${NC}"
    echo -e "${YELLOW}  Adding .env.local to .gitignore...${NC}"
    echo ".env.local" >> .gitignore
    echo -e "${GREEN}✓ Added .env.local to .gitignore${NC}"
fi

echo ""

# Check if node_modules exists
echo -e "${YELLOW}Checking dependencies...${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ Dependencies not installed${NC}"
    echo -e "${YELLOW}  Run: npm install${NC}"
fi

echo ""

# Check for exposed keys in env.example
echo -e "${YELLOW}Checking for exposed secrets...${NC}"
if grep -E "sk-ant-api|sk-proj-" env.example | grep -v "your-" > /dev/null 2>&1; then
    echo -e "${RED}⚠️  WARNING: env.example may contain real API keys!${NC}"
    echo -e "${YELLOW}  Please remove any real keys from env.example${NC}"
else
    echo -e "${GREEN}✓ No exposed secrets in env.example${NC}"
fi

echo ""
echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}   Next Steps${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""
echo -e "1. ${YELLOW}Update .env.local with your actual credentials${NC}"
echo -e "2. ${YELLOW}Run the DATABASE_MIGRATION.sql in Supabase SQL Editor${NC}"
echo -e "3. ${YELLOW}Revoke any exposed API keys and generate new ones${NC}"
echo -e "4. ${YELLOW}Start the dev server: npm run dev${NC}"
echo ""
echo -e "${BLUE}For detailed instructions, see: URGENT_FIXES_NEEDED.md${NC}"
echo ""

