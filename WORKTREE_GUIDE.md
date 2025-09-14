# Git Worktree Development Guide

## Overview

We're using Git worktrees to enable parallel development of microservices. Each service gets its own worktree, allowing multiple Claude Code sessions to work simultaneously without conflicts.

## Current Worktrees

```bash
# List all worktrees
git worktree list
```

### Active Worktrees

| Service | Branch | Path | Purpose |
|---------|--------|------|---------|
| Memory Storage | feature/memory-storage | ../recall-memory-storage | Core storage implementation |
| Vector Embedding | feature/vector-embedding | ../recall-vector-embedding | AI/ML embeddings |
| Search Query | feature/search-query | ../recall-search-query | Search service |
| Memory Graph | feature/memory-graph | ../recall-memory-graph | Graph relationships |

## How to Use Worktrees

### For New Claude Code Sessions

#### Option 1: Work on Existing Service
```bash
# Navigate to service worktree
cd ../recall-memory-storage

# Start Claude Code
claude

# Your session now works on memory storage service
```

#### Option 2: Create New Service Worktree
```bash
# From main repo
git worktree add ../recall-[service-name] -b feature/[service-name]

# Navigate to new worktree
cd ../recall-[service-name]

# Start development
claude
```

### Development Workflow

1. **Choose Your Service**
   ```bash
   cd ../recall-vector-embedding  # Example
   ```

2. **Check Your Task**
   ```bash
   cat microservices-design/tasks/ACTIVE_TASKS.md
   ```

3. **Develop Your Feature**
   - All changes isolated to this branch
   - No conflicts with other services
   - Full access to shared design docs

4. **Commit Your Work**
   ```bash
   git add .
   git commit -m "feat(vector-embedding): Implement FAISS index"
   ```

5. **Push Your Branch**
   ```bash
   git push origin feature/vector-embedding
   ```

6. **Create Pull Request**
   ```bash
   gh pr create --title "Vector Embedding Service Implementation"
   ```

## Parallel Development Scenarios

### Scenario 1: Four Services, Four Developers

```bash
# Terminal 1: Storage Developer
cd ../recall-memory-storage
claude  # Works on PostgreSQL and Redis

# Terminal 2: Embedding Developer
cd ../recall-vector-embedding
claude  # Works on OpenAI and FAISS

# Terminal 3: Search Developer
cd ../recall-search-query
claude  # Works on Elasticsearch

# Terminal 4: Graph Developer
cd ../recall-memory-graph
claude  # Works on Neo4j
```

### Scenario 2: Service Team Collaboration

Multiple developers on same service:
```bash
# Create sub-feature branches
cd ../recall-memory-storage
git checkout -b feature/memory-storage-postgres
# Developer 1 works on PostgreSQL

cd ../recall-memory-storage
git checkout -b feature/memory-storage-redis
# Developer 2 works on Redis
```

## Managing Worktrees

### List All Worktrees
```bash
git worktree list
```

Output:
```
/Users/oliver/mcp-servers/mem0-hybrid         44b6582 [main]
/Users/oliver/mcp-servers/recall-memory-storage    44b6582 [feature/memory-storage]
/Users/oliver/mcp-servers/recall-vector-embedding  44b6582 [feature/vector-embedding]
/Users/oliver/mcp-servers/recall-search-query      44b6582 [feature/search-query]
/Users/oliver/mcp-servers/recall-memory-graph      44b6582 [feature/memory-graph]
```

### Remove Completed Worktree
```bash
# After PR is merged
git worktree remove ../recall-memory-storage
```

### Prune Stale Worktrees
```bash
git worktree prune
```

## Integration Points

### Shared Design Documents
All worktrees share the same design documents:
- `microservices-design/` - Architecture and planning
- `MICROSERVICES_ARCHITECTURE.md` - Overall design
- `PROJECT_CONTEXT.md` - Getting started guide

### API Contracts
Define contracts in main branch:
```bash
cd /Users/oliver/mcp-servers/mem0-hybrid
# Edit contracts
vim microservices-design/contracts/openapi/memory-storage.yaml
git add .
git commit -m "feat: Define memory storage API contract"
git push
```

### Pulling Updates
Each worktree can pull main branch updates:
```bash
cd ../recall-vector-embedding
git fetch origin
git merge origin/main  # Get latest contracts/docs
```

## Best Practices

### 1. One Service Per Worktree
- Keep services isolated
- Prevents merge conflicts
- Clear ownership

### 2. Regular Syncs
```bash
# Daily sync with main
git fetch origin
git merge origin/main
```

### 3. Small, Frequent Commits
```bash
git add -p  # Stage selectively
git commit -m "feat(service): Specific change"
```

### 4. Update Task Status
After completing work:
```bash
# Update task file
vim microservices-design/tasks/ACTIVE_TASKS.md
# Mark your task as complete [x]
```

### 5. Clean Up After Merge
```bash
# After PR is merged
cd ..
git worktree remove recall-memory-storage
cd mem0-hybrid
git branch -d feature/memory-storage
```

## Troubleshooting

### Worktree Locked
```bash
# If worktree is locked
git worktree unlock ../recall-memory-storage
```

### Can't Remove Worktree
```bash
# Force removal
git worktree remove --force ../recall-memory-storage
```

### Sync Issues
```bash
# Reset to main
git fetch origin
git reset --hard origin/main
```

### Find Worktree Location
```bash
# If you forget where worktrees are
git worktree list
```

## Quick Reference

```bash
# Create service worktree
git worktree add ../recall-[service] -b feature/[service]

# List worktrees
git worktree list

# Remove worktree
git worktree remove ../recall-[service]

# Switch between worktrees
cd ../recall-[other-service]

# Update from main
git fetch origin && git merge origin/main

# Push changes
git push origin feature/[service]

# Create PR
gh pr create
```

## Service Development Checklist

For each service worktree:

- [ ] Navigate to worktree directory
- [ ] Check ACTIVE_TASKS.md for assignments
- [ ] Create service structure
- [ ] Define API contracts
- [ ] Implement core functionality
- [ ] Write tests (>80% coverage)
- [ ] Update documentation
- [ ] Commit and push changes
- [ ] Create pull request
- [ ] Clean up worktree after merge

## Monitoring Progress

### Check All Service Status
```bash
for dir in ../recall-*; do
  echo "=== $(basename $dir) ==="
  cd $dir
  git status --short
  cd - > /dev/null
done
```

### View All Branches
```bash
git branch -a | grep feature/
```

### Check PR Status
```bash
gh pr list
```

## Conclusion

Worktrees enable truly parallel development. Each service team can work independently, commit without conflicts, and integrate through well-defined contracts.

**Start developing**: Pick a worktree, navigate to it, and start building!

---

*Remember: Each worktree is a full copy of the repo on a different branch. Work freely without fear of conflicts!*