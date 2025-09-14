# Project Context Guide for Claude Code

## Quick Start for Claude Code

When you enter this project, here's what you need to know:

### 1. Start Here
- **Vision**: Read `microservices-design/vision/META_VISION.md` for the big picture
- **Architecture**: Read `MICROSERVICES_ARCHITECTURE.md` for technical design
- **Current Work**: Check `microservices-design/tasks/ACTIVE_TASKS.md` for what needs doing

### 2. Project Structure

```
recall/
├── PROJECT_CONTEXT.md           # YOU ARE HERE - Start reading this
├── MICROSERVICES_ARCHITECTURE.md # Full technical architecture
├── AGENT_ORCHESTRATION.yaml     # How parallel agents work together
│
├── microservices-design/        # ALL DESIGN DOCS
│   ├── vision/                  # Big picture documents
│   │   └── META_VISION.md      # Human impact and why we're building this
│   │
│   ├── tasks/                   # Actionable work items
│   │   ├── ACTIVE_TASKS.md     # Current tasks being worked on
│   │   ├── TODO_PARALLEL.md    # Tasks that can be done in parallel
│   │   └── service-*/          # Individual service task breakdowns
│   │
│   ├── services/                # Service-specific designs
│   │   ├── memory-storage/     # Core storage service
│   │   ├── vector-embedding/   # AI embeddings service
│   │   ├── search-query/       # Search service
│   │   └── ...                 # Other services
│   │
│   ├── contracts/              # API contracts and interfaces
│   │   ├── openapi/           # OpenAPI specifications
│   │   ├── asyncapi/          # Event specifications
│   │   └── graphql/           # GraphQL schemas
│   │
│   └── specs/                  # Technical specifications
│       ├── data-models/       # Data structure definitions
│       ├── event-schemas/     # Event message formats
│       └── protocols/         # Communication protocols
│
├── lib/                        # IMPLEMENTED FEATURES
│   ├── memory-update.js      # Smart memory updates with conflict resolution
│   ├── batch-operations.js   # Efficient bulk processing
│   ├── realtime-sync.js      # WebSocket real-time updates
│   └── vector-embeddings.js  # Semantic search implementation
│
├── index.js                   # Main MCP server entry point
├── package.json              # Dependencies and scripts
└── README.md                 # User-facing documentation
```

## Understanding the Project

### What is r3call?

r3call is an **intelligent memory infrastructure** that's evolving from a simple cache+storage system into a distributed microservices platform for augmented human cognition.

### Current State (January 2025)

**Completed**:
- ✅ Memory update with conflict resolution
- ✅ Batch operations for bulk processing
- ✅ WebSocket real-time sync
- ✅ Vector embeddings for semantic search

**In Progress**:
- 🔄 Microservices decomposition
- 🔄 Parallel task planning
- 🔄 Service contract definitions

**Upcoming**:
- ⏳ Memory graph relationships
- ⏳ Analytics dashboard
- ⏳ Edge computing distribution
- ⏳ AI-powered summarization

## For New Claude Code Sessions

### If you're continuing work:

1. **Check active tasks**:
   ```bash
   cat microservices-design/tasks/ACTIVE_TASKS.md
   ```

2. **Find your service**:
   ```bash
   ls microservices-design/services/
   ```

3. **Pick up where left off**:
   - Each service has its own `TODO.md`
   - Tasks are marked as: `[ ]` TODO, `[~]` In Progress, `[x]` Done

### If you're starting fresh:

1. **Understand the vision**:
   - Read `microservices-design/vision/META_VISION.md`

2. **Choose a parallel task**:
   - Check `microservices-design/tasks/TODO_PARALLEL.md`
   - Pick any unassigned task

3. **Follow the pattern**:
   - Design first (in `microservices-design/services/YOUR_SERVICE/`)
   - Define contracts (in `microservices-design/contracts/`)
   - Implement (in `lib/` or new service repo)
   - Test thoroughly
   - Document everything

## Key Design Decisions

### Architecture Principles
1. **Microservices**: Each service is independent and can be developed in parallel
2. **Event-Driven**: Services communicate through events, not direct calls
3. **API-First**: All contracts defined before implementation
4. **Cloud-Native**: Designed for Kubernetes and horizontal scaling

### Technology Choices
- **Languages**: Node.js (primary), Python (ML/AI), Go (performance-critical)
- **Storage**: Redis (L1 cache), PostgreSQL (primary), Neo4j (graph)
- **Messaging**: RabbitMQ (events), Kafka (streaming)
- **Search**: Elasticsearch (full-text), FAISS (vector)

### Development Workflow
1. **Parallel Development**: Multiple agents work on different services
2. **Contract-First**: Define APIs before coding
3. **Test-Driven**: Write tests alongside code
4. **Documentation**: Update docs as you go

## Working on Tasks

### Task File Format

Each task file in `microservices-design/tasks/service-*/` follows this format:

```markdown
# Service Name - Task List

## Current Sprint
- [ ] Task 1 - Assignee: @agent-id
- [~] Task 2 (in progress) - Assignee: @agent-id
- [x] Task 3 (completed) - Assignee: @agent-id

## Backlog
- [ ] Future task 1
- [ ] Future task 2
```

### Claiming a Task

1. Find an unassigned task in any service's TODO.md
2. Add your agent identifier
3. Change `[ ]` to `[~]` when starting
4. Change `[~]` to `[x]` when complete
5. Commit your changes

### Creating New Tasks

If you identify new work needed:

1. Add to appropriate service's `TODO.md`
2. Mark if it can be done in parallel
3. Add to `TODO_PARALLEL.md` if independent
4. Define success criteria

## Integration Points

### When Services Need to Communicate

1. **Define the contract** in `microservices-design/contracts/`
2. **Use events** for loose coupling (AsyncAPI specs)
3. **Use REST/GraphQL** for synchronous needs (OpenAPI specs)
4. **Document data flow** in service README

### Common Patterns

- **Event Sourcing**: All changes emit events
- **CQRS**: Separate read and write models
- **Saga Pattern**: Distributed transactions
- **Circuit Breaker**: Fault tolerance

## Getting Help

### If you're stuck:

1. **Check existing implementations** in `lib/`
2. **Review similar services** in `microservices-design/services/`
3. **Look for patterns** in completed work
4. **Leave detailed notes** about blockers in task files

### Documentation to Update

When you make changes:

1. **Service README**: Update service-specific docs
2. **API Contracts**: Update OpenAPI/AsyncAPI specs
3. **Task Status**: Mark tasks complete
4. **Integration Guides**: Document how services connect

## Success Criteria

Your work is complete when:

1. ✅ Code is implemented and tested
2. ✅ API contracts are defined
3. ✅ Documentation is updated
4. ✅ Task is marked complete
5. ✅ Integration points are documented
6. ✅ Other services can use your work

## Remember the Mission

We're not just building software—we're creating the infrastructure for augmented human cognition. Every line of code enables better thinking, learning, and connection for humanity.

**Your work matters. Build with purpose.**

---

## Quick Commands

```bash
# See all active tasks
find microservices-design/tasks -name "*.md" -exec grep -l "\[~\]" {} \;

# Find unassigned tasks
grep -r "\[ \]" microservices-design/tasks/

# Check service status
ls -la microservices-design/services/

# Run tests
npm test

# Start development
npm run dev
```

## Next Steps

1. Choose your focus area
2. Read relevant service design
3. Pick or create tasks
4. Start building
5. Document as you go

**Welcome to r3call. Let's build the future of human memory together.**