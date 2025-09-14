# Claude Instructions for r3call Project

## CRITICAL: Read STYLE_GUIDE.md First

**MANDATORY**: Always read and follow the style guide at `STYLE_GUIDE.md` before making any changes to this project.

## Key Rules

1. **NO EMOJIS** - Never use emojis in any context within this project
2. **Brand Name** - Always use "Newth.ai" not "Newth"
3. **Current Year** - Use 2025 in copyright notices
4. **Professional Tone** - Maintain technical, clear communication

## Project Structure

```
recall/
├── index.js           # Main MCP server entry point
├── cli.js            # CLI tool for testing
├── lib/              # Core library modules
├── test/             # Test files
├── docs/             # Documentation
├── assets/           # Images and static assets
├── website/          # Documentation website
└── STYLE_GUIDE.md    # Style guidelines (READ THIS)
```

## Development Workflow

1. Read STYLE_GUIDE.md before any work
2. Follow existing code patterns
3. Test changes with `npm test`
4. Use the unified release workflow via GitHub Actions
5. Never commit directly to npm - use the release workflow

## Release Process

Use GitHub Actions workflow only:

```bash
# Trigger via GitHub CLI
gh workflow run release.yml -f version=patch|minor|major

# Or use the release script
npm run release:patch
npm run release:minor
npm run release:major
```

## Code Style

- Use ES modules (import/export)
- Async/await over promises
- Descriptive variable names
- No decorative comments
- No emojis in any context

## Documentation Updates

When updating documentation:

1. Check STYLE_GUIDE.md first
2. Remove any emojis if found
3. Use clear, technical language
4. Test all code examples
5. Update both README and website docs if needed

## Common Mistakes to Avoid

- Adding emojis to documentation
- Using "Newth" instead of "Newth.ai"
- Publishing directly to npm (use GitHub Actions)
- Not reading STYLE_GUIDE.md
- Adding decorative elements to professional documentation

## Testing

```bash
# Run tests (currently requires Redis and Mem0 API key)
npm test

# Run specific test file
node test/test-suite.js
```

## Important Files

- `STYLE_GUIDE.md` - Style and formatting rules (NO EMOJIS)
- `README.md` - Main documentation (keep professional)
- `.github/workflows/release.yml` - Unified release process
- `package.json` - Version and dependencies
