#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

clear

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Command Center - Quick Fix Assistant               ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load environment
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs 2>/dev/null)
fi

echo -e "${CYAN}${BOLD}This script will guide you through fixing the 2 critical issues.${NC}"
echo ""
echo -e "${YELLOW}⚠️  You'll need to:${NC}"
echo -e "  1. Get a new Anthropic API key from https://console.anthropic.com/"
echo -e "  2. Run a SQL migration in Supabase"
echo ""
echo -e "${YELLOW}Time required: About 10 minutes${NC}"
echo ""
read -p "Ready to start? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Okay! When you're ready, run: ./quick-fix.sh${NC}"
    exit 0
fi

clear

# ============================================
# STEP 1: Fix Anthropic API Key
# ============================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  STEP 1/3: Fix Anthropic API Key                             ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Current status:${NC}"
./test-api-keys.sh 2>/dev/null | grep -A 2 "Testing Anthropic"

echo ""
echo -e "${CYAN}${BOLD}Instructions:${NC}"
echo ""
echo -e "1. ${YELLOW}Open this URL in your browser:${NC}"
echo -e "   ${GREEN}https://console.anthropic.com/${NC}"
echo ""
echo -e "2. ${YELLOW}Revoke the old key (IMPORTANT!):${NC}"
echo -e "   • Find key starting with: ${RED}sk-ant-api03-Bl2fTROF3r0M...${NC}"
echo -e "   • Click 'Revoke' or 'Delete'"
echo ""
echo -e "3. ${YELLOW}Create a new API key:${NC}"
echo -e "   • Click 'Create Key' or 'New API Key'"
echo -e "   • Name it: 'Command Center Dev'"
echo -e "   • ${BOLD}Copy the key immediately!${NC} (you won't see it again)"
echo ""
echo -e "4. ${YELLOW}Update .env.local:${NC}"
echo -e "   • Find the line: ${CYAN}ANTHROPIC_API_KEY=...${NC}"
echo -e "   • Replace with your new key: ${CYAN}ANTHROPIC_API_KEY=sk-ant-YOUR-NEW-KEY${NC}"
echo ""

read -p "Press Enter when you've completed these steps..."
echo ""

# Test the new key
echo -e "${YELLOW}Testing your new Anthropic API key...${NC}"
export $(cat .env.local | grep -v '^#' | xargs 2>/dev/null)

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

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ SUCCESS! Your Anthropic API key is now valid!${NC}"
    echo ""
    read -p "Press Enter to continue to Step 2..."
else
    echo -e "${RED}✗ The API key is still not valid (HTTP $http_code)${NC}"
    echo ""
    echo -e "${YELLOW}Please double-check:${NC}"
    echo -e "  • Did you copy the entire key?"
    echo -e "  • Did you update .env.local (not env.example)?"
    echo -e "  • Did you save the file?"
    echo ""
    read -p "Try again? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        exec "$0"
    else
        echo -e "${YELLOW}Run ./quick-fix.sh again when ready${NC}"
        exit 1
    fi
fi

clear

# ============================================
# STEP 2: Run Database Migration
# ============================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  STEP 2/3: Run Database Migration                            ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}${BOLD}Instructions:${NC}"
echo ""
echo -e "1. ${YELLOW}Open this URL in your browser:${NC}"
echo -e "   ${GREEN}https://supabase.com/dashboard/project/${NEXT_PUBLIC_SUPABASE_URL#*//}${NC}"
echo -e "   ${GREEN}https://supabase.com/dashboard${NC}"
echo ""
echo -e "2. ${YELLOW}Navigate to SQL Editor:${NC}"
echo -e "   • Click 'SQL Editor' in the left sidebar"
echo -e "   • Click 'New Query' button"
echo ""
echo -e "3. ${YELLOW}Copy the migration script:${NC}"
echo -e "   • Open the file: ${CYAN}DATABASE_MIGRATION.sql${NC}"
echo -e "   • Select ALL contents (Cmd+A or Ctrl+A)"
echo -e "   • Copy (Cmd+C or Ctrl+C)"
echo ""
echo -e "4. ${YELLOW}Run the migration:${NC}"
echo -e "   • Paste into Supabase SQL Editor (Cmd+V or Ctrl+V)"
echo -e "   • Click 'Run' button (or press Ctrl+Enter)"
echo -e "   • Wait for success messages (~10 seconds)"
echo ""
echo -e "5. ${YELLOW}Verify it worked:${NC}"
echo -e "   • Create another new query"
echo -e "   • Copy/paste contents of: ${CYAN}verify-database-setup.sql${NC}"
echo -e "   • Run it - all checks should show ✓"
echo ""

read -p "Press Enter when you've completed these steps..."
echo ""

echo -e "${GREEN}✓ Great! Database migration should be complete!${NC}"
echo ""
read -p "Press Enter to continue to Step 3..."

clear

# ============================================
# STEP 3: Restart and Test
# ============================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  STEP 3/3: Restart and Test                                  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}${BOLD}Final Steps:${NC}"
echo ""
echo -e "1. ${YELLOW}Restart your development server:${NC}"
echo -e "   • Stop the current server (press Ctrl+C in the terminal running it)"
echo -e "   • Start it again: ${CYAN}npm run dev${NC}"
echo ""
echo -e "2. ${YELLOW}Test in your browser:${NC}"
echo -e "   • Go to: ${GREEN}http://localhost:3000${NC}"
echo -e "   • Navigate to a brand's chat page"
echo -e "   • Send a test message"
echo -e "   • Verify you get a response ${BOLD}without errors${NC}"
echo ""
echo -e "3. ${YELLOW}Check for errors:${NC}"
echo -e "   • Open browser console (F12 → Console tab)"
echo -e "   • Should be no errors"
echo -e "   • Check terminal - should be no 401 or match_documents errors"
echo ""

read -p "Press Enter when you've tested the application..."
echo ""

# Final verification
echo -e "${YELLOW}Running final verification...${NC}"
echo ""

./test-api-keys.sh 2>/dev/null

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                        ALL DONE! 🎉                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}${BOLD}Congratulations!${NC} Your Command Center should now be fully operational."
echo ""
echo -e "${CYAN}What you can do now:${NC}"
echo -e "  • Chat with AI using Claude or GPT models"
echo -e "  • Upload brand documents for knowledge base"
echo -e "  • Create and manage email campaigns"
echo -e "  • Use RAG to leverage brand knowledge"
echo ""
echo -e "${YELLOW}If you encounter any issues:${NC}"
echo -e "  • Check: ${CYAN}TROUBLESHOOTING_GUIDE.md${NC}"
echo -e "  • Run: ${CYAN}./setup-check.sh${NC}"
echo -e "  • Run: ${CYAN}./test-api-keys.sh${NC}"
echo ""
echo -e "${BOLD}Happy building! 🚀${NC}"
echo ""

