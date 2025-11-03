#!/bin/bash

# Documentation Cleanup Script
# Archives redundant documentation files

echo "📚 Starting documentation cleanup..."

# Create archive directory
mkdir -p docs/archive

# Files to keep (main documentation)
KEEP_FILES=(
  "README.md"
  "SETUP_GUIDE.md"
  "ARCHITECTURE_OVERVIEW.md"
  "DEPLOYMENT_CHECKLIST.md"
  "TROUBLESHOOTING_GUIDE.md"
  "COMPREHENSIVE_CODE_REVIEW.md"
)

# Move all MD files to archive except the ones we want to keep
for file in *.md; do
  if [[ ! " ${KEEP_FILES[@]} " =~ " ${file} " ]]; then
    echo "📦 Archiving: $file"
    mv "$file" docs/archive/
  else
    echo "✅ Keeping: $file"
  fi
done

# Move SQL migration files to organized directory
mkdir -p docs/database-migrations
echo "📦 Moving SQL migrations..."
mv *.sql docs/database-migrations/ 2>/dev/null || true

# Move shell scripts to scripts directory
mkdir -p scripts
echo "📦 Moving shell scripts..."
mv *.sh scripts/ 2>/dev/null || true

# Keep this cleanup script in root for reference
mv scripts/cleanup-docs.sh . 2>/dev/null || true

echo "✨ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "  - Kept documentation: ${#KEEP_FILES[@]} files"
echo "  - Archived: $(ls docs/archive/*.md 2>/dev/null | wc -l | tr -d ' ') files"
echo "  - SQL migrations: $(ls docs/database-migrations/*.sql 2>/dev/null | wc -l | tr -d ' ') files"
echo ""
echo "💡 Archived files are in: docs/archive/"

