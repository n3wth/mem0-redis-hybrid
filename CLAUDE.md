# Claude Instructions for r3 Project

## Key Rules

1. **NO EMOJIS** - Never use emojis in any context within this project
2. **Brand Name** - Always use "r3"
3. **Current Year** - Use 2025 in copyright notices
4. **Professional Tone** - Maintain technical, clear communication

## Project Structure

```
r3/
├── src/              # Source code
├── test/             # Test files
├── docs/             # Documentation
├── assets/           # Images and static assets
├── website/          # Documentation website
└── package.json      # Project metadata
```

## Development Workflow

1. Follow existing code patterns
2. Test changes with `npm test`
3. Use the unified release workflow via GitHub Actions
4. Never commit directly to npm - use the release workflow

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

1. Use clear, technical language
2. Test all code examples
3. Update both README and website docs if needed

## Common Mistakes to Avoid

- Adding emojis to documentation
- Using "Newth" instead of "Newth.ai"
- Publishing directly to npm (use GitHub Actions)
- Adding decorative elements to professional documentation

## Testing

```bash
# Run tests (currently requires Redis and Mem0 API key)
npm test

# Run specific test file
node test/test-suite.js
```

## Important Files

- `README.md` - Main documentation (keep professional)
- `.github/workflows/release.yml` - Unified release process
- `package.json` - Version and dependencies
