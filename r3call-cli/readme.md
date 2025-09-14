# R3CALL CLI - Terminal UI for Memory Management

A beautiful React Ink-based terminal interface for managing your R3CALL memories. Navigate, search, add, and delete memories with an intuitive keyboard-driven interface.

## Features

- **Interactive Menu System**: Navigate with keyboard shortcuts
- **Search Memories**: Find memories with semantic search
- **Add Memories**: Quickly add new memories from the terminal
- **View All Memories**: Browse through your entire memory collection
- **Delete Memories**: Remove unwanted memories with visual confirmation
- **Loading Animations**: Smooth spinners for async operations
- **Error Handling**: Clear error messages and recovery

## Installation

```bash
npm install
npm run build
npm link  # Optional: to use globally
```

## Usage

### Basic Usage

```bash
# Run locally
./dist/cli.js

# Or if linked globally
r3call-cli
```

### With API Configuration

```bash
# Custom API endpoint
r3call-cli --api-url https://api.r3call.com

# With authentication
R3CALL_API_KEY=your-api-key r3call-cli

# Custom user ID
r3call-cli --user-id myuser
```

### Environment Variables

- `R3CALL_API_KEY` or `MEM0_API_KEY`: API key for authentication
- `R3CALL_API_URL`: Base URL for the R3CALL API (default: http://localhost:3030)
- `R3CALL_USER_ID`: User ID for memory operations (default: default)

## Interface Navigation

### Main Menu
- **[s]** - Search memories
- **[a]** - Add new memory
- **[v]** - View all memories
- **[d]** - Delete memory
- **[q]** - Quit application
- **ESC/Ctrl+C** - Exit at any time

### Search Mode
- Type your search query
- Press **Enter** to search
- View results with similarity scores
- Press **ESC** to return to menu

### Add Memory Mode
- Type your memory content
- Press **Enter** to save
- Press **ESC** to cancel

### View/Delete Mode
- Use **↑/↓** arrow keys to navigate
- Press **Enter** to confirm deletion (in delete mode)
- Press **[b]** to go back to menu

## Development

```bash
# Install dependencies
npm install

# Development mode (watch for changes)
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Architecture

Built with:
- **React Ink**: React for CLIs
- **TypeScript**: Type-safe development
- **Axios**: HTTP client for API calls
- **Meow**: CLI argument parsing

## Project Structure

```
r3call-cli/
├── source/
│   ├── app.tsx          # Main React component
│   ├── cli.tsx          # CLI entry point
│   └── SimpleSpinner.tsx # Custom spinner component
├── dist/                # Compiled JavaScript
└── package.json
```

## Screenshots

```
R3CALL Memory Manager
─────────────────────
Choose an option:

[s] Search memories
[a] Add new memory
[v] View all memories
[d] Delete memory
[q] Quit
```

## Contributing

This is a companion tool for the R3CALL memory system. Feel free to extend and customize for your needs.

## License

MIT