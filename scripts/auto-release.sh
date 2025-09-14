#!/bin/bash

# Auto-release script for @n3wth/recall
# Usage: ./scripts/auto-release.sh [patch|minor|major]
# This script triggers the GitHub Actions workflow for a unified release process

VERSION_TYPE=${1:-patch}

echo "🚀 Recall Release Manager"
echo "========================"
echo ""

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo "❌ Error: Invalid version type '$VERSION_TYPE'"
    echo "Usage: ./scripts/auto-release.sh [patch|minor|major]"
    exit 1
fi

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Error: You must be on the main branch to release"
    echo "Current branch: $CURRENT_BRANCH"
    echo ""
    echo "Run: git checkout main"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "❌ Error: You have uncommitted changes"
    echo "Please commit or stash them before releasing"
    echo ""
    git status --short
    exit 1
fi

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ Error: GitHub CLI (gh) is not installed"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo "❌ Error: Not authenticated with GitHub"
    echo "Run: gh auth login"
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main --ff-only || {
    echo "❌ Error: Failed to pull latest changes"
    echo "Resolve any conflicts and try again"
    exit 1
}

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📊 Current version: v$CURRENT_VERSION"
echo "📦 Release type: $VERSION_TYPE"
echo ""

# Confirm release
echo "This will trigger a GitHub Actions workflow that will:"
echo "  1. Run tests"
echo "  2. Bump version ($VERSION_TYPE)"
echo "  3. Create git tag and push to GitHub"
echo "  4. Publish to npm registry"
echo "  5. Create GitHub release with changelog"
echo ""
read -p "🚀 Proceed with release? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Release cancelled"
    exit 1
fi

# Trigger GitHub Actions workflow
echo ""
echo "🎬 Triggering GitHub Actions release workflow..."
gh workflow run release.yml -f version=$VERSION_TYPE

echo ""
echo "✅ Release workflow triggered!"
echo ""
echo "📋 Next steps:"
echo "1. Monitor workflow: gh run watch"
echo "2. View in browser: gh run view --web"
echo "3. Check npm: https://www.npmjs.com/package/@n3wth/recall"
echo "4. Check releases: https://github.com/n3wth/recall/releases"
echo ""
echo "The workflow will handle all release steps automatically."