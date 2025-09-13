#!/bin/bash

# Auto-release script for mem0-redis-hybrid
# Usage: ./scripts/auto-release.sh [patch|minor|major]

VERSION_TYPE=${1:-patch}

echo "🚀 Auto-Release Script for @n3wth/mem0-redis-hybrid"
echo "======================================================"

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Error: You must be on the main branch to release"
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "❌ Error: You have uncommitted changes"
    echo "Please commit or stash them before releasing"
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Run tests
echo "🧪 Running tests..."
npm test || {
    echo "❌ Tests failed. Fix them before releasing."
    exit 1
}

# Bump version
echo "📦 Bumping version ($VERSION_TYPE)..."
npm version $VERSION_TYPE -m "chore(release): %s

- Enhanced error handling and recovery
- Added TypeScript definitions
- Implemented connection pooling
- Created CLI tool for management
- Added comprehensive examples
- Set up CI/CD pipeline

Co-Authored-By: Claude <noreply@anthropic.com>"

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")

echo "🏷️  New version: $NEW_VERSION"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main --follow-tags

# Publish to npm
echo "📦 Publishing to npm..."
npm publish

# Create GitHub release
echo "📝 Creating GitHub release..."
gh release create "v$NEW_VERSION" \
    --title "Release v$NEW_VERSION" \
    --notes "## What's Changed

### ✨ Features
- Enhanced error handling with circuit breaker pattern
- Redis connection pooling for better performance
- TypeScript definitions for improved DX
- CLI tool for testing and management
- Comprehensive examples and documentation

### 🚀 Installation
\`\`\`bash
npm install @n3wth/mem0-redis-hybrid@$NEW_VERSION
\`\`\`

### 🎯 CLI Usage
\`\`\`bash
npx mem0-cli
\`\`\`

### 📚 Documentation
See the [README](https://github.com/n3wth/mem0-redis-hybrid#readme) for detailed usage instructions.
" || echo "Failed to create GitHub release (might need 'gh' CLI installed)"

echo ""
echo "✅ Release v$NEW_VERSION completed successfully!"
echo ""
echo "Next steps:"
echo "1. Check npm: https://www.npmjs.com/package/@n3wth/mem0-redis-hybrid"
echo "2. Check GitHub: https://github.com/n3wth/mem0-redis-hybrid/releases"
echo "3. Update changelog if needed"