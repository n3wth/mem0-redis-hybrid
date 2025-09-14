# Contributing to Mem0-Redis Hybrid MCP Server

First off, thank you for considering contributing to the Mem0-Redis Hybrid MCP Server! It's people like you that make this tool better for everyone.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Accept feedback gracefully

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Your environment details (Node version, OS, Redis version)
- Any relevant logs or error messages

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- Use a clear and descriptive title
- Provide a detailed description of the proposed functionality
- Explain why this enhancement would be useful
- List any alternative solutions you've considered

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Write clear, commented code** following the existing style
3. **Add tests** for any new functionality
4. **Update documentation** as needed
5. **Ensure all tests pass** before submitting
6. **Write a clear PR description** explaining your changes

## Development Process

### Setting Up Your Development Environment

```bash
# Clone your fork
git clone https://github.com/your-username/mem0-redis-hybrid.git
cd mem0-redis-hybrid

# Add upstream remote
git remote add upstream https://github.com/n3wth/mem0-redis-hybrid.git

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Mem0 API key and Redis URL
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
node test.js

# Run cache invalidation tests
node test-cache-invalidation.js
```

### Code Style

- Use ES6+ features (arrow functions, const/let, template literals)
- Keep functions small and focused
- Add JSDoc comments for public methods
- Use meaningful variable and function names
- Prefer async/await over callbacks

Example:
```javascript
/**
 * Searches memories with caching strategy
 * @param {Object} params - Search parameters
 * @param {string} params.query - Search query
 * @param {boolean} params.prefer_cache - Use cache-first strategy
 * @returns {Promise<Array>} Array of matching memories
 */
async function searchMemory({ query, prefer_cache = true }) {
    // Implementation
}
```

### Testing Guidelines

- Write tests for new features
- Ensure existing tests still pass
- Test edge cases and error conditions
- Mock external services (Mem0 API, Redis) when appropriate
- Aim for high code coverage

### Commit Messages

Follow conventional commit format:

```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `perf`: Performance improvements
- `chore`: Build process or auxiliary tool changes

Example:
```
feat(cache): Add two-tier caching system

Implemented L1 (hot) and L2 (warm) cache tiers with different TTLs
to optimize memory usage and response times.

Closes #123
```

## Project Structure

```
mem0-redis-hybrid/
├── index.js              # Main server implementation
├── test.js               # Primary test suite
├── test-cache-invalidation.js  # Cache invalidation tests
├── package.json          # Dependencies and scripts
├── README.md            # Documentation
├── LICENSE              # MIT license
└── CONTRIBUTING.md      # This file
```

### Key Components

- **MCP Server**: Handles communication with Claude/other clients
- **Cache Manager**: Manages Redis caching layers (L1/L2)
- **Job Queue**: Handles async memory processing
- **Pub/Sub System**: Manages cache invalidation
- **Background Sync**: Keeps cache fresh with periodic updates

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md with release notes
3. Create a pull request with version bump
4. After merge, create a GitHub release
5. Publish to npm (maintainers only)

## Getting Help

- Check the [README](README.md) for usage documentation
- Search [existing issues](https://github.com/n3wth/mem0-redis-hybrid/issues)
- Join discussions in [GitHub Discussions](https://github.com/n3wth/mem0-redis-hybrid/discussions)
- Ask questions in issues with the `question` label

## Recognition

Contributors will be recognized in:
- The project README
- Release notes for their contributions
- GitHub's contributor graph

Thank you for contributing! 🎉