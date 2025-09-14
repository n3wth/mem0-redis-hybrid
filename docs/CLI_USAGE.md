# R3CALL CLI Usage Guide

The `r3call` command provides multiple interfaces for interacting with your memory system.

## Installation

```bash
npm install -g r3call
# or use directly with npx
npx r3call
```

## Commands

### Start MCP Server (Default)

```bash
npx r3call
# or
npx r3call serve
```

Starts the Model Context Protocol server for use with Claude, Cursor, or other MCP-compatible tools.

### Interactive Memory Manager UI

```bash
npx r3call ui
```

Launches a clean, interactive terminal UI that **connects directly to your local memory database**:

- Uses the same Redis/Mem0 backend as the MCP server
- No separate API server needed
- **Search memories** with semantic search
- **Add new memories** quickly
- **View all memories** with navigation
- **Delete memories** safely
- Keyboard-driven interface with visual feedback

### Advanced UI (Experimental)

```bash
npx r3call manage
```

Launches the advanced terminal UI with:

- Real-time performance statistics
- Command palette (Ctrl+K)
- Popular and recent memories
- Knowledge graph visualization
- Advanced keyboard shortcuts

## Configuration

### Local Database Connection

The UI mode (`npx r3call ui`) connects directly to your local memory database:

- Uses SQLite database at `./data/memories.db`
- Connects to Redis if available (for caching)
- No external API server required
- Same data as the MCP server uses

### Environment Variables

```bash
# Redis connection (optional, for caching)
export REDIS_URL=redis://localhost:6379

# User ID for memory operations
export R3CALL_USER_ID=myuser

# Run the UI with local connection
npx r3call ui
```

### MCP Server Configuration

When using as an MCP server with Claude:

```bash
# Mem0 API key (required for cloud sync)
export MEM0_API_KEY=your-mem0-key

# Start the MCP server
npx r3call
```

## UI Navigation

### Main Menu (UI Mode)

- **[s]** - Search memories
- **[a]** - Add new memory
- **[v]** - View all memories
- **[d]** - Delete memory
- **[q]** - Quit
- **ESC/Ctrl+C** - Exit at any time

### Search Mode

- Type to search
- **Enter** - Execute search
- **ESC** - Return to menu
- Results show similarity scores

### Navigation

- **↑/↓** - Navigate items
- **Enter** - Select/confirm
- **[b]** - Go back
- **ESC** - Cancel/back

## Examples

### Basic Usage

```bash
# Start the interactive UI
npx r3call ui

# With authentication
R3CALL_API_KEY=sk-xxx npx r3call ui

# Custom endpoint
npx r3call ui --api-url https://my-r3call-instance.com
```

### MCP Server Mode

```bash
# Start for use with Claude
npx r3call

# With Redis URL
REDIS_URL=redis://localhost:6379 npx r3call

# Debug mode
npx r3call --debug
```

### Advanced Features

```bash
# Launch advanced UI with statistics
npx r3call manage

# Use with specific user context
npx r3call ui --user-id project-alpha
```

## Troubleshooting

### Connection Issues

- Ensure Redis is running if using local setup
- Check API key is set correctly
- Verify API URL is accessible

### UI Not Displaying Correctly

- Use a modern terminal (iTerm2, Terminal.app, etc.)
- Ensure terminal supports Unicode characters
- Try resizing terminal window

### Performance

- The UI caches data locally for fast response
- Search is optimized for instant results
- Use arrow keys for smooth navigation

## Integration with MCP

When using with Claude or other MCP tools:

1. Add to your MCP settings:

```json
{
  "mcpServers": {
    "r3call": {
      "command": "npx",
      "args": ["r3call"],
      "env": {
        "MEM0_API_KEY": "your-key",
        "REDIS_URL": "redis://localhost:6379"
      }
    }
  }
}
```

2. The server will start automatically when Claude connects

## Tips

- Use the UI mode for quick memory management
- The advanced mode shows performance metrics
- Environment variables persist across sessions
- Search supports partial matches and semantic similarity
- Add memories directly from the terminal for quick capture
