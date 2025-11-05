#!/bin/bash

###############################################################################
# PORTFOLIO SANITIZATION SCRIPT
#
# This script sanitizes the stock management system to create a portfolio
# demo version by removing all client-specific information.
#
# Author: Stock Portfolio Demo Project
# Date: November 5, 2025
###############################################################################

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHANGES=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        PORTFOLIO SANITIZATION SCRIPT                      ║${NC}"
echo -e "${BLUE}║        Removing client-specific information              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

###############################################################################
# BACKUP CHECK
###############################################################################
echo -e "${YELLOW}⚠️  WARNING: This script will modify multiple files.${NC}"
echo -e "${YELLOW}   Make sure you have a backup of the original project!${NC}"
echo ""
read -p "Do you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}❌ Sanitization cancelled by user.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Starting sanitization process...${NC}"
echo ""

###############################################################################
# FUNCTION: Replace text in files
###############################################################################
replace_text() {
    local search_text="$1"
    local replace_text="$2"
    local file_pattern="$3"
    local description="$4"

    echo -e "${BLUE}📝 Replacing: ${description}${NC}"

    # Find and replace using sed
    local count=0
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            # Use different delimiter (|) to avoid conflicts with /
            sed -i "s|${search_text}|${replace_text}|g" "$file"
            count=$((count + 1))
            echo -e "   ${GREEN}✓${NC} Updated: $file"
        fi
    done < <(grep -rl "$search_text" --include="$file_pattern" . 2>/dev/null || true)

    if [ $count -eq 0 ]; then
        echo -e "   ${YELLOW}⚠${NC}  No files found with this pattern"
    else
        echo -e "   ${GREEN}✓${NC} Updated $count file(s)"
        TOTAL_CHANGES=$((TOTAL_CHANGES + count))
    fi
    echo ""
}

###############################################################################
# 1. REPLACE COMPANY NAME
###############################################################################
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 1: Replacing Company Name${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

replace_text \
    "Santos & Penedo e Cia LTDA" \
    "Demo Parts Distributor Inc." \
    "*.{ts,tsx,md}" \
    "Full company name (Santos & Penedo e Cia LTDA → Demo Parts Distributor Inc.)"

replace_text \
    "Santos & Penedo" \
    "Demo Parts Co." \
    "*.{ts,tsx,md}" \
    "Short company name (Santos & Penedo → Demo Parts Co.)"

###############################################################################
# 2. REPLACE PRODUCT DESCRIPTION
###############################################################################
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 2: Replacing Product Descriptions${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

replace_text \
    "Filtros, Palhetas e Óleos Lubrificantes" \
    "Automotive Parts & Supplies" \
    "*.{ts,tsx,md}" \
    "Product description variant 1"

replace_text \
    "Filtros • Palhetas • Óleos Lubrificantes" \
    "Automotive Parts & Supplies" \
    "*.{ts,tsx,md}" \
    "Product description variant 2"

###############################################################################
# 3. REMOVE DEVELOPER PERSONAL INFO
###############################################################################
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 3: Removing Developer Personal Information${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

replace_text \
    'Desenvolvido por <a href="https://www.linkedin.com/in/joelsonlopes/" target="_blank">Joelson Lopes</a>' \
    'System Generated Report' \
    "*.{ts,tsx}" \
    "Developer LinkedIn link in PDF template"

replace_text \
    "joelsonlopes85@gmail.com" \
    "demo@example.com" \
    "*.{ts,tsx,md}" \
    "Developer email address"

###############################################################################
# 4. UPDATE REPOSITORY REFERENCES
###############################################################################
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 4: Updating Repository References${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

replace_text \
    "stock-santospenedo" \
    "stock-portfolio-demo" \
    "*.{ts,tsx,md,json}" \
    "Repository name references"

###############################################################################
# 5. SANITIZE DOCUMENTATION
###############################################################################
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 5: Sanitizing Documentation Files${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Update specific documentation files
if [ -f "./README.md" ]; then
    echo -e "${BLUE}📝 Updating README.md${NC}"
    sed -i 's|Este projeto é privado e proprietário.*||g' ./README.md
    sed -i 's|# Force deploy.*||g' ./README.md
    echo -e "   ${GREEN}✓${NC} README.md sanitized"
    echo ""
fi

###############################################################################
# 6. VERIFY CHANGES
###############################################################################
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 6: Verification${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}🔍 Checking for remaining client references...${NC}"
echo ""

# Check for remaining client references
REMAINING_SANTOS=$(grep -r "Santos & Penedo" --include="*.{ts,tsx}" . 2>/dev/null | grep -v "CONTEXTO-CONTINUACAO.md" | wc -l)
REMAINING_FILTROS=$(grep -r "Filtros.*Palhetas.*Óleos" --include="*.{ts,tsx}" . 2>/dev/null | grep -v "CONTEXTO-CONTINUACAO.md" | wc -l)
REMAINING_JOELSON=$(grep -r "joelsonlopes" --include="*.{ts,tsx}" . 2>/dev/null | wc -l)

echo "   Santos & Penedo references: $REMAINING_SANTOS"
echo "   Product description references: $REMAINING_FILTROS"
echo "   Developer info references: $REMAINING_JOELSON"
echo ""

if [ $REMAINING_SANTOS -eq 0 ] && [ $REMAINING_FILTROS -eq 0 ] && [ $REMAINING_JOELSON -eq 0 ]; then
    echo -e "${GREEN}✓ No client-specific references found in code!${NC}"
else
    echo -e "${YELLOW}⚠  Some references still exist (check documentation files)${NC}"
fi

###############################################################################
# SUMMARY
###############################################################################
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SANITIZATION COMPLETE${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✓ Total files modified: $TOTAL_CHANGES${NC}"
echo ""
echo -e "${YELLOW}📋 NEXT STEPS:${NC}"
echo -e "   1. Review changes with: git diff"
echo -e "   2. Create .env.example file"
echo -e "   3. Add demo banner component"
echo -e "   4. Update README.md with portfolio information"
echo -e "   5. Create PORTFOLIO.md documentation"
echo -e "   6. Set up new Supabase project for demo"
echo ""
echo -e "${GREEN}✓ Sanitization process completed successfully!${NC}"
echo ""
