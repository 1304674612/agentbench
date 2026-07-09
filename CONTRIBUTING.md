# Contributing to AgentBench

Thank you for your interest in contributing to AgentBench! This document outlines the process for contributing to the project.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

- Use the [GitHub Issues](https://github.com/1304674612/agentbench/issues) tracker
- Include steps to reproduce, expected behavior, and actual behavior
- Include your environment details (OS, Node.js version, pnpm version)

### Suggesting Features

- Open a [Feature Request](https://github.com/1304674612/agentbench/issues/new) issue
- Describe the problem you're solving and your proposed solution
- Include examples of how the feature would be used

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Make your changes
4. Run the test suite: `cd packages/core && npx vitest run`
5. Run type checking: `pnpm typecheck`
6. Commit with [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` — New feature
   - `fix:` — Bug fix
   - `docs:` — Documentation
   - `refactor:` — Code refactoring
   - `test:` — Tests
   - `chore:` — Build/config changes
7. Push and open a Pull Request

## Development Setup

```bash
# Clone
git clone git@github.com:1304674612/agentbench.git
cd agentbench

# Install
pnpm install

# Start infrastructure
docker compose up -d

# Initialize database
cp .env.example .env
pnpm db:push

# Start development
pnpm dev
```

## Project Structure

```
agentbench/
├── apps/
│   ├── web/          Next.js 15 Dashboard + API
│   └── cli/          Commander.js CLI
├── packages/
│   ├── core/         @agentbench/core (Engine)
│   ├── openai/       @agentbench/openai
│   ├── anthropic/    @agentbench/anthropic
│   ├── mcp/          @agentbench/mcp
│   └── adapter/      @agentbench/adapter
├── docs/             Documentation
└── .github/          CI workflows
```

## Coding Standards

- **Language**: TypeScript (strict mode)
- **Formatting**: Biome (run `pnpm format`)
- **Linting**: Biome (run `pnpm lint`)
- **Commit Messages**: [Conventional Commits](https://www.conventionalcommits.org/)
- **Testing**: Vitest for unit tests
- **Type Safety**: Zero type errors required before merge

## Testing

```bash
# Run all unit tests
cd packages/core && npx vitest run

# Run with coverage
cd packages/core && npx vitest run --coverage

# Type check all packages
pnpm typecheck
```

## Documentation

- API documentation lives in `docs/API_REFERENCE.md`
- CLI documentation lives in `docs/CLI_REFERENCE.md`
- Architecture decisions in `docs/ARCHITECTURE.md`
- Wiki pages are synced from `docs/`

## Release Process

1. Update `CHANGELOG.md`
2. Bump version in `package.json` files
3. Create a git tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
4. Push tags: `git push --tags`
5. Create a GitHub Release with release notes

## Questions?

Open a [Discussion](https://github.com/1304674612/agentbench/discussions) or join the community.
