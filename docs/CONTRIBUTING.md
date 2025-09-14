# Contributing to r3

Thank you for your interest in contributing to r3. This document provides comprehensive guidelines for contributing to the project. We value all contributions, from bug reports to feature implementations.

## Code of Conduct

This project and everyone participating in it is governed by the [r3 Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

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

#### Before You Start

1. **Check existing issues and PRs** to avoid duplicate work
2. **Discuss major changes** in an issue before implementation
3. **Read the architecture documentation** to understand the codebase

#### PR Process

1. **Fork the repository** and create your branch from `main`
   - Feature branches: `feature/description`
   - Bug fixes: `fix/issue-number-description`
   - Documentation: `docs/description`

2. **Write clear, commented code** following the existing style
   - Use TypeScript for all new code
   - Follow the established patterns in the codebase
   - Keep functions small and focused
   - Add JSDoc comments for public APIs

3. **Add tests** for any new functionality
   - Unit tests for individual functions
   - Integration tests for feature interactions
   - Aim for >80% code coverage on new code

4. **Update documentation** as needed
   - Update README.md for user-facing changes
   - Update inline code comments
   - Add/update JSDoc comments
   - Update website documentation if applicable

5. **Ensure all tests pass** before submitting
   ```bash
   npm test
   npm run lint
   npm run typecheck
   ```

6. **Write a clear PR description** explaining your changes
   - Link to related issues
   - Describe the problem and solution
   - Include screenshots for UI changes
   - List any breaking changes

#### PR Review Process

- PRs require at least one approving review
- Address all feedback constructively
- Keep PRs focused - one feature/fix per PR
- Rebase on main if conflicts arise
- Squash commits before merging when appropriate

## Development Process

### Setting Up Your Development Environment

```bash
# Clone your fork
git clone https://github.com/your-username/r3.git
cd r3

# Add upstream remote
git remote add upstream https://github.com/n3wth/r3.git

# Install dependencies
npm install
```

### Running Tests

```bash
# Run all tests
npm test
```

### Code Style

#### General Guidelines

- **TypeScript**: Use TypeScript for all code
- **ES Modules**: Use import/export syntax
- **Async/Await**: Prefer over callbacks and raw promises
- **Error Handling**: Always handle errors appropriately
- **No Console Logs**: Use proper logging utilities
- **No Emojis**: Maintain professional code and documentation

#### Naming Conventions

- **Files**: kebab-case (e.g., `memory-manager.ts`)
- **Classes**: PascalCase (e.g., `MemoryManager`)
- **Functions/Methods**: camelCase (e.g., `searchMemory`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Interfaces**: PascalCase with 'I' prefix discouraged

#### Code Organization

```typescript
// 1. Imports (grouped and ordered)
import { readFile } from 'fs/promises';
import type { Config } from './types';

// 2. Constants
const DEFAULT_TIMEOUT = 5000;

// 3. Types/Interfaces
interface SearchParams {
  query: string;
  prefer_cache?: boolean;
}

// 4. Main implementation
/**
 * Searches memories with a caching strategy.
 * @param params - Search parameters.
 * @returns Array of matching memories.
 * @throws {Error} If search fails.
 */
export async function searchMemory(
  params: SearchParams
): Promise<Memory[]> {
  const { query, prefer_cache = true } = params;

  try {
    // Implementation with proper error handling
    if (prefer_cache) {
      const cached = await checkCache(query);
      if (cached) return cached;
    }

    return await performSearch(query);
  } catch (error) {
    logger.error('Search failed', { error, params });
    throw new SearchError('Memory search failed', { cause: error });
  }
}
```

#### Testing Standards

- Write tests alongside code changes
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Test edge cases and error conditions

```typescript
describe('searchMemory', () => {
  it('should return cached results when prefer_cache is true', async () => {
    // Arrange
    const mockCache = jest.fn().mockResolvedValue([{ id: '1' }]);

    // Act
    const result = await searchMemory({
      query: 'test',
      prefer_cache: true
    });

    // Assert
    expect(mockCache).toHaveBeenCalledWith('test');
    expect(result).toHaveLength(1);
  });
});
```

### Commit Messages

#### Conventional Commit Format

```
type(scope): subject

body (optional)

footer (optional)
```

#### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semicolons, etc)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvements
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes to build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

#### Scope Examples

- `cache`: Caching system
- `mcp`: MCP server implementation
- `cli`: Command-line interface
- `docs`: Documentation
- `deps`: Dependencies
- `config`: Configuration

#### Subject Guidelines

- Use imperative mood ("add" not "adds" or "added")
- Don't capitalize first letter
- No period at the end
- Limit to 50 characters

#### Body Guidelines

- Wrap at 72 characters
- Explain what and why, not how
- Include motivation for change
- Contrast with previous behavior

#### Footer Guidelines

- Reference issues: `Closes #123`, `Fixes #456`
- Note breaking changes: `BREAKING CHANGE: description`
- Co-authors: `Co-authored-by: Name <email>`

#### Examples

```
feat(cache): implement two-tier caching system

Added L1 (hot) and L2 (warm) cache tiers with configurable TTLs
to optimize memory usage and reduce response times.

- L1 cache: 5-minute TTL for frequently accessed data
- L2 cache: 1-hour TTL for less frequent access
- Automatic promotion/demotion between tiers

Closes #123
```

```
fix(mcp): handle connection timeouts gracefully

Previously, connection timeouts would cause the entire server
to crash. Now implements exponential backoff and retry logic.

Fixes #456
```

```
docs: update installation instructions for Windows

Added specific instructions for Windows users including
PowerShell commands and common troubleshooting steps.
```

## Project Structure

```
r3/
├── src/                  # Source code
│   ├── core/             # Core memory engine
│   ├── handlers/         # Tool handlers
│   ├── lib/              # Library modules
│   └── types/            # TypeScript types
├── test/                 # Test files
├── docs/                 # Documentation
├── website/              # Documentation website
└── package.json          # Project metadata
```

### Key Components

- **MCP Server**: Handles communication with Claude/other clients
- **Cache Manager**: Manages Redis caching layers
- **Vector Embeddings**: Handles semantic search and entity extraction
- **Knowledge Graph**: Builds and queries the knowledge graph

## Release Process

The release process is automated using GitHub Actions. To create a new release, use the following commands:

```bash
# Trigger a new release via the release script
npm run release:patch
npm run release:minor
npm run release:major
```

This will automatically bump the version, create a new git tag, and publish the package to npm.

## Review Process

### Code Review Guidelines

Reviewers will check for:

1. **Functionality**: Does the code do what it's supposed to?
2. **Tests**: Are there adequate tests? Do they pass?
3. **Documentation**: Is the code well-documented?
4. **Style**: Does it follow our coding standards?
5. **Performance**: Are there any performance concerns?
6. **Security**: Are there any security implications?
7. **Breaking Changes**: Are changes backward compatible?

### Review Timeline

- Initial review within 48 hours
- Follow-up reviews within 24 hours of changes
- Approved PRs merged within 24 hours

## Community Guidelines

### Communication

- Be respectful and constructive
- Assume good intentions
- Welcome newcomers
- Provide context in discussions
- Focus on facts and technical merit

### Decision Making

- Technical decisions made through discussion
- Major changes require issue discussion first
- Breaking changes need maintainer approval
- Community input valued and considered

## Recognition

### Contributors

All contributors are recognized in:
- The project's contributors page
- Release notes for significant contributions
- Special mentions for exceptional contributions

### Types of Contributions

We value all contributions including:
- Code contributions
- Documentation improvements
- Bug reports and testing
- Design and UX feedback
- Community support and mentoring
- Security research

## Getting Help

### Resources

- **Documentation**: [README.md](../README.md) and [website docs](https://r3.newth.ai/docs)
- **Issues**: [GitHub Issues](https://github.com/n3wth/r3/issues)
- **Discussions**: [GitHub Discussions](https://github.com/n3wth/r3/discussions)
- **Security**: [Security Policy](SECURITY.md)

### Getting Started

1. **Good First Issues**: Look for issues labeled `good-first-issue`
2. **Help Wanted**: Check issues labeled `help-wanted`
3. **Documentation**: Start with documentation improvements
4. **Tests**: Add missing tests
5. **Examples**: Create usage examples

### Questions?

- Open an issue with the `question` label
- Start a discussion in GitHub Discussions
- Review existing Q&A in discussions

Thank you for contributing to r3. Your efforts help make this tool better for everyone in the community!
