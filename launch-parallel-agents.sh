#!/bin/bash

# Parallel Agent Launch Script for Recall Microservices Development
# This script launches multiple Claude Code and Gemini sessions for parallel development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR=$(dirname "$(pwd)")
MAIN_REPO="$(pwd)"

echo -e "${BLUE}🚀 Launching Parallel Development Agents${NC}"
echo "================================================"

# Function to launch Claude Code in a worktree
launch_claude() {
    local service=$1
    local worktree_path=$2
    local task_focus=$3

    echo -e "${GREEN}Launching Claude for ${service}...${NC}"

    # Create launch script for this service
    cat > "${worktree_path}/claude-task.md" << EOF
# Task Assignment: ${service}

## Your Mission
You are working on the **${service}** microservice for Recall.

## Worktree Location
You are in: ${worktree_path}

## Primary Tasks
${task_focus}

## Instructions
1. Read PROJECT_CONTEXT.md for overview
2. Check microservices-design/tasks/ACTIVE_TASKS.md
3. Find tasks for ${service}
4. Implement features in this worktree
5. Commit to branch: feature/${service}
6. Update task status when complete

## Available Commands
- npm test - Run tests
- npm run dev - Start development
- git status - Check changes
- git add . && git commit -m "feat(${service}): Your message"
- git push origin feature/${service}

Start by checking what needs to be done for ${service}!
EOF

    # Launch Claude in new terminal window (macOS)
    osascript -e "tell app \"Terminal\" to do script \"cd ${worktree_path} && claude --dangerously-skip-permissions --context claude-task.md\""

    sleep 2
}

# Function to launch Gemini for a worktree
launch_gemini() {
    local service=$1
    local worktree_path=$2
    local task_focus=$3

    echo -e "${YELLOW}Launching Gemini for ${service}...${NC}"

    # Create Gemini task file
    cat > "${worktree_path}/gemini-task.md" << EOF
# Gemini Task: ${service}

## Service: ${service}
## Location: ${worktree_path}

## Tasks to Complete:
${task_focus}

## Gemini Commands:
\`\`\`bash
# Navigate to worktree
cd ${worktree_path}

# Check tasks
gm -p "@./ What tasks need to be done for ${service} service?"

# Analyze codebase
gm -p "@./ Analyze the ${service} implementation requirements"

# Work on implementation
gm --code "@./ Implement the ${service} service following the microservices design"
\`\`\`

## Git Workflow:
1. Make changes
2. git add .
3. git commit -m "feat(${service}): Implementation via Gemini"
4. git push origin feature/${service}
EOF

    # Launch Gemini in new terminal
    osascript -e "tell app \"Terminal\" to do script \"cd ${worktree_path} && echo 'Gemini workspace ready for ${service}' && gm -p '@./ Read gemini-task.md and start working on ${service} service'\""

    sleep 2
}

# Ensure worktrees exist or create them
ensure_worktree() {
    local service=$1
    local branch="feature/${service}"
    local worktree_path="${BASE_DIR}/recall-${service}"

    if [ ! -d "${worktree_path}" ]; then
        echo -e "${BLUE}Creating worktree for ${service}...${NC}"
        git worktree add "${worktree_path}" -b "${branch}"
    else
        echo -e "${GREEN}Worktree exists for ${service}${NC}"
    fi

    echo "${worktree_path}"
}

# Main execution
echo -e "${BLUE}Setting up worktrees...${NC}"
echo "------------------------"

# Define services and their primary tasks using functions instead of associative array
get_service_tasks() {
    local service=$1
    case $service in
        "memory-storage")
            echo "- Implement PostgreSQL schema
- Create Redis caching layer
- Build REST API endpoints
- Add GraphQL resolvers"
            ;;
        "vector-embedding")
            echo "- Integrate OpenAI API
- Setup Sentence-Transformers
- Implement FAISS indexing
- Create embedding cache"
            ;;
        "search-query")
            echo "- Setup Elasticsearch
- Implement query parser
- Build ranking algorithm
- Create GraphQL API"
            ;;
        "memory-graph")
            echo "- Design Neo4j schema
- Implement graph traversal
- Add community detection
- Build visualization API"
            ;;
        "realtime-sync")
            echo "- Enhance WebSocket server
- Integrate RabbitMQ
- Build subscription system
- Add event replay"
            ;;
        "analytics")
            echo "- Setup Prometheus metrics
- Create Grafana dashboards
- Build analytics API
- Implement aggregations"
            ;;
    esac
}

# Launch Claude agents for primary services
echo -e "\n${GREEN}=== Launching Claude Agents ===${NC}"
for service in "memory-storage" "vector-embedding" "search-query" "memory-graph"; do
    worktree_path=$(ensure_worktree "$service")
    tasks=$(get_service_tasks "$service")
    launch_claude "$service" "$worktree_path" "$tasks"
done

# Launch Gemini agents for additional services
echo -e "\n${YELLOW}=== Launching Gemini Agents ===${NC}"
for service in "realtime-sync" "analytics"; do
    worktree_path=$(ensure_worktree "$service")
    tasks=$(get_service_tasks "$service")
    launch_gemini "$service" "$worktree_path" "$tasks"
done

# Create monitoring dashboard
echo -e "\n${BLUE}Creating monitoring dashboard...${NC}"

cat > "${MAIN_REPO}/monitor-agents.sh" << 'MONITOR'
#!/bin/bash

# Monitor all agent progress
clear
echo "📊 Recall Microservices Development Dashboard"
echo "=============================================="
echo ""

# Check each worktree
for worktree in ../recall-*/; do
    if [ -d "$worktree" ]; then
        service=$(basename "$worktree" | sed 's/recall-//')
        echo "📦 Service: $service"

        cd "$worktree" 2>/dev/null || continue

        # Check git status
        changes=$(git status --porcelain | wc -l)
        branch=$(git branch --show-current)

        echo "  ├─ Branch: $branch"
        echo "  ├─ Changes: $changes files"

        # Check last commit
        last_commit=$(git log -1 --pretty=format:"%h - %s (%cr)" 2>/dev/null || echo "No commits yet")
        echo "  ├─ Last: $last_commit"

        # Check if tests exist and pass
        if [ -f "package.json" ]; then
            if npm test --silent > /dev/null 2>&1; then
                echo "  └─ Tests: ✅ Passing"
            else
                echo "  └─ Tests: ❌ Failing"
            fi
        else
            echo "  └─ Tests: ⏳ Not setup"
        fi

        echo ""
        cd - > /dev/null
    fi
done

echo "=============================================="
echo "💡 Tip: Run 'gh pr list' to see open pull requests"
echo "🔄 Refreshing in 30 seconds... (Ctrl+C to exit)"
MONITOR

chmod +x "${MAIN_REPO}/monitor-agents.sh"

# Create PR creation helper
cat > "${MAIN_REPO}/create-prs.sh" << 'PRSCRIPT'
#!/bin/bash

# Create pull requests for all services with changes

echo "🔄 Creating Pull Requests for completed services..."
echo ""

for worktree in ../recall-*/; do
    if [ -d "$worktree" ]; then
        service=$(basename "$worktree" | sed 's/recall-//')

        cd "$worktree"

        # Check if there are commits to push
        if git log origin/main..HEAD --oneline | grep -q .; then
            echo "📤 Creating PR for $service..."

            # Push changes
            branch=$(git branch --show-current)
            git push origin "$branch" 2>/dev/null

            # Create PR
            gh pr create \
                --title "feat: Implement $service microservice" \
                --body "Implementation of $service service as part of microservices architecture.

## Changes
- Core implementation
- API contracts
- Tests
- Documentation

## Related
- Part of Recall microservices transformation
- See MICROSERVICES_ARCHITECTURE.md for details" \
                --label "microservice,$service" \
                2>/dev/null && echo "  ✅ PR created for $service" || echo "  ⏭️  PR already exists for $service"
        else
            echo "⏭️  No changes in $service"
        fi

        cd - > /dev/null
        echo ""
    fi
done

echo "✅ Done! Check PRs at: https://github.com/n3wth/recall/pulls"
PRSCRIPT

chmod +x "${MAIN_REPO}/create-prs.sh"

# Final summary
echo ""
echo -e "${GREEN}✅ Parallel Development Environment Ready!${NC}"
echo "==========================================="
echo ""
echo "🤖 Agents Launched:"
echo "  - 4 Claude Code sessions (primary services)"
echo "  - 2 Gemini sessions (additional services)"
echo ""
echo "📁 Worktree Locations:"
for service in "memory-storage" "vector-embedding" "search-query" "memory-graph" "realtime-sync" "analytics"; do
    echo "  - ../recall-${service}"
done
echo ""
echo "🛠️  Useful Commands:"
echo "  ./monitor-agents.sh     - Monitor all agent progress"
echo "  ./create-prs.sh         - Create PRs for completed work"
echo "  git worktree list       - List all worktrees"
echo ""
echo "📊 Monitor Progress:"
echo "  - Each terminal window shows an agent working"
echo "  - Check monitor-agents.sh for real-time status"
echo "  - View tasks in microservices-design/tasks/"
echo ""
echo -e "${YELLOW}⚡ Agents are now working in parallel!${NC}"
echo "Check each terminal window to see progress."
echo ""
echo "Happy building! 🚀"