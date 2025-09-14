#!/bin/bash

# Simplified parallel development starter for Recall microservices
# This creates the worktrees and provides instructions for manual launch

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_DIR=$(dirname "$(pwd)")

echo -e "${BLUE}🚀 Setting Up Parallel Development Environment${NC}"
echo "================================================"

# Create worktrees for additional services
echo -e "\n${GREEN}Creating additional worktrees...${NC}"

# Create realtime-sync worktree
if [ ! -d "${BASE_DIR}/recall-realtime-sync" ]; then
    git worktree add "${BASE_DIR}/recall-realtime-sync" -b feature/realtime-sync
    echo "✅ Created worktree for realtime-sync"
fi

# Create analytics worktree
if [ ! -d "${BASE_DIR}/recall-analytics" ]; then
    git worktree add "${BASE_DIR}/recall-analytics" -b feature/analytics
    echo "✅ Created worktree for analytics"
fi

echo -e "\n${GREEN}✅ All worktrees ready!${NC}"
echo ""
echo "📁 Available Worktrees:"
git worktree list | while read line; do
    echo "  $line"
done

echo ""
echo "================================================"
echo -e "${YELLOW}📋 Manual Launch Instructions${NC}"
echo "================================================"
echo ""
echo "Open 6 terminal windows/tabs and run these commands:"
echo ""
echo -e "${GREEN}Terminal 1 - Memory Storage:${NC}"
echo "  cd ../recall-memory-storage"
echo "  claude --dangerously-skip-permissions"
echo "  # Tell Claude: 'Work on memory-storage service tasks from ACTIVE_TASKS.md'"
echo ""
echo -e "${GREEN}Terminal 2 - Vector Embedding:${NC}"
echo "  cd ../recall-vector-embedding"
echo "  claude --dangerously-skip-permissions"
echo "  # Tell Claude: 'Work on vector-embedding service tasks from ACTIVE_TASKS.md'"
echo ""
echo -e "${GREEN}Terminal 3 - Search Query:${NC}"
echo "  cd ../recall-search-query"
echo "  claude --dangerously-skip-permissions"
echo "  # Tell Claude: 'Work on search-query service tasks from ACTIVE_TASKS.md'"
echo ""
echo -e "${GREEN}Terminal 4 - Memory Graph:${NC}"
echo "  cd ../recall-memory-graph"
echo "  claude --dangerously-skip-permissions"
echo "  # Tell Claude: 'Work on memory-graph service tasks from ACTIVE_TASKS.md'"
echo ""
echo -e "${YELLOW}Terminal 5 - Real-time Sync (Gemini):${NC}"
echo "  cd ../recall-realtime-sync"
echo "  gm -p '@./ Work on realtime-sync service from TODO_PARALLEL.md'"
echo ""
echo -e "${YELLOW}Terminal 6 - Analytics (Gemini):${NC}"
echo "  cd ../recall-analytics"
echo "  gm -p '@./ Work on analytics service from TODO_PARALLEL.md'"
echo ""
echo "================================================"
echo ""
echo "🎯 Quick Start for Each Agent:"
echo ""
echo "1. Navigate to the worktree directory"
echo "2. Start Claude or Gemini as shown above"
echo "3. Direct the agent to:"
echo "   - Read PROJECT_CONTEXT.md"
echo "   - Check microservices-design/tasks/ACTIVE_TASKS.md"
echo "   - Implement their specific service"
echo "   - Commit to their feature branch"
echo ""
echo "📊 To monitor progress:"
echo "  ./monitor-agents.sh"
echo ""
echo "🔄 To create PRs when ready:"
echo "  ./create-prs.sh"
echo ""
echo -e "${BLUE}Ready to start parallel development!${NC}"
echo "Open your terminals and let's build! 🚀"