# Enterprise Multi-Agent Code Review Orchestrator

Build a production-ready multi-agent system that automates code review using the Claude Agent SDK.

## Project Overview

This system uses multiple specialized AI agents working together to provide comprehensive code reviews:

- **Main Orchestrator** - Coordinates the review process and aggregates results
- **Code Quality Analyzer** - Identifies code smells, anti-patterns, and best practice violations
- **Test Coverage Analyzer** - Evaluates test completeness and suggests missing test cases
- **Refactoring Suggester** - Recommends architectural improvements and refactoring opportunities

## What's Provided

This starter includes the infrastructure you need:

- **Type Definitions** (`src/types/`) - Zod schemas for validation
- **Logger** (`src/utils/logger.ts`) - Winston structured logging
- **Report Generator** (`src/utils/report-generator.ts`) - Markdown/HTML/JSON report generation
- **Project Config** - `package.json`, `tsconfig.json`, `.env.example`
- **Test Skeletons** (`tests/`) - Test file structure
- **Example Skill** (`.claude/skills/`) - Sample Claude skill

## What You Need to Implement

Your tasks:

1. **Agent Definitions** (`src/agents/`)
   - Code Quality Analyzer
   - Test Coverage Analyzer
   - Refactoring Suggester

2. **Prompts** (`src/prompts/`)
   - Orchestrator prompt
   - Agent-specific prompts

3. **MCP Configuration** (`src/config/mcp.config.ts`)
   - GitHub MCP server
   - ESLint MCP server

4. **Orchestrator** (`src/orchestrator.ts`)
   - Main coordination logic
   - Agent spawning and result aggregation

5. **Main Entry Point** (`src/main.ts`)
   - CLI argument parsing
   - Environment validation
   - Report generation

6. **Error Handler** (Recommended) (`src/utils/error-handler.ts`)
   - Custom `ReviewError` class
   - Retry logic with exponential backoff
   - Timeout wrapper

7. **Rate Limiter** (Optional) (`src/utils/rate-limiter.ts`)
   - Token bucket algorithm with sliding window
   - Request and token tracking
   - Concurrent request management

## Getting Started

### Prerequisites

- Node.js 18+
- Anthropic API access (provided in Vocareum workspace) or [your own API key](https://console.anthropic.com/)
- [GitHub Personal Access Token](https://github.com/settings/tokens) (recommended - scopes: `repo`, `read:org`)

### Installation

**In Vocareum Workspace (Recommended):**

Your workspace comes pre-configured with Anthropic API credentials.

```bash
# Install dependencies from repository root (uses npm workspaces)
cd /voc/work/cd14715-claude-code-classroom
npm install

# Navigate to project and configure
cd project/starter
cp .env.example .env
```

**Local Setup:**

```bash
# Clone the repository
git clone https://github.com/udacity/cd14715-claude-code-classroom.git
cd cd14715-claude-code-classroom/project/starter

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

### Configuration

Edit `.env` with your settings:

**In Vocareum Workspace:**
```bash
# API credentials are already in your environment - don't add them here

# Model Configuration (REQUIRED)
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# Project root (REQUIRED)
PROJECT_ROOT=/voc/work/cd14715-claude-code-classroom/project/starter

# GitHub Token (RECOMMENDED for higher rate limits)
# GITHUB_TOKEN=ghp_your-token-here

# Logging level (optional)
LOG_LEVEL=info
```

**Local Setup with Your Own API Key:**
```bash
# Your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Model Configuration (REQUIRED)
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# Project root (REQUIRED - update to your path)
PROJECT_ROOT=/absolute/path/to/project/starter

# GitHub Token (RECOMMENDED)
# GITHUB_TOKEN=ghp_your-token-here

# Logging level (optional)
LOG_LEVEL=info
```

### Running

```bash
# Development mode
npm run dev -- <owner> <repo> <pr-number>

# Production build
npm run build
npm start <owner> <repo> <pr-number>

# Example
npm run dev -- facebook react 12345
```

### Testing

```bash
# Run all tests
npm test

# Run specific test
npm test -- orchestrator.test.ts

# Watch mode
npm test -- --watch
```

## Key Technologies

- **Claude Agent SDK** - Multi-agent orchestration framework
- **Model Context Protocol (MCP)** - External data integration
- **Zod** - Schema validation and type safety
- **TypeScript** - Type-safe development
- **Vitest** - Testing framework
- **Winston** - Structured logging

## Success Criteria

Your implementation is complete when:

- [ ] TypeScript compiles without errors: `npm run build`
- [ ] All tests pass: `npm test`
- [ ] Can review a real PR: `npm start owner repo pr-number`
- [ ] Generates reports in at least one format (MD, HTML, JSON)
- [ ] Rate limiting prevents API throttling (Optional)
- [ ] Errors are handled gracefully (Recommended)

## Resources

- [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [Zod Documentation](https://zod.dev/)

## Implementation notes

Verified offline: `npm run build` and `npm run lint` are both clean, `npm test` passes 29/29
(1 integration test intentionally skipped — see below), and the CLI's argument/auth validation was
smoke-tested directly (missing args, a non-numeric PR number, and no credentials all fail with the
intended message and exit code). Verified live: a complete, real, unassisted PR review run — see
the "Live run" section below.

A few real things worth knowing before running this for real:

- **`@modelcontextprotocol/server-github` is the deprecated legacy GitHub MCP server** (`npm install`
  prints "Package no longer supported"), not GitHub's newer official `github-mcp-server`. Its actual
  tools are `get_pull_request`, `get_pull_request_files`, `get_file_contents`, etc. — **not** the
  `pull_request_read`-style names GitHub's current server uses. Confirmed by connecting an MCP client
  directly and listing tools, rather than guessing. `orchestrator.ts`'s `allowedTools` and the
  orchestrator prompt use the real names.
- **`@eslint/mcp` exposes exactly one tool**, `lint-files`, which requires real local absolute file
  paths — it can't lint remote content. That's why the orchestrator prompt has the agent write each
  fetched PR file to `.pr-review-workspace/<owner>-<repo>-<pr>/` before analyzing it.
- **`permissionMode: 'bypassPermissions'`** (with `allowDangerouslySkipPermissions: true`) is used
  deliberately for this non-interactive CI/CD-style CLI — there's no human present to answer a
  permission prompt, and `'dontAsk'` would silently deny anything not pre-enumerated. `allowedTools`
  still scopes what's actually available.
- **The model is never hardcoded** — `CodeReviewOrchestrator` reads `ANTHROPIC_MODEL` (or an explicit
  constructor option), since the same code has to work against both the Anthropic API and Bedrock
  model IDs.
- **`tests/orchestrator.test.ts`'s integration test doesn't call `vi.unmock()`.** Vitest hoists
  `vi.mock`/`vi.unmock` calls to module-load time regardless of which function they're textually
  inside — including a skipped test's callback — so an unmock call there would have silently
  un-mocked the SDK for every other test in the file (this actually happened during development: all
  5 mocked tests hung for exactly vitest's 5s default timeout, calling the real SDK with no
  credentials, until this was traced down and fixed). See the comment on that test for how to run it
  for real.
- `src/utils/rate-limiter.ts` needed two `noUncheckedIndexedAccess` null-guards
  (`tsconfig.json` has it enabled) that the provided skeleton didn't have, in `release()` and
  `waitForRateLimit()` — both are simple existence checks, not behavior changes.
- **This folder runs `@anthropic-ai/claude-agent-sdk@0.3.250` and Zod v4**, not the course-pinned
  `0.1.77`/Zod v3 — see [evidence/sdk-upgrade-resolution.md](evidence/sdk-upgrade-resolution.md)
  for why, and exactly what the migration touched.

### Live run: working, on an upgraded SDK

This is the upgraded variant of this submission. The version pinned by the course
(`@anthropic-ai/claude-agent-sdk@0.1.77`) has a confirmed, reproducible bug that crashes every
real PR review before a report can be produced — full writeup in
[evidence/known-issue-sdk-microcompact.md](evidence/known-issue-sdk-microcompact.md). This folder
upgrades past it (`0.3.250`, which required migrating `src/types/` from Zod v3 to v4) and proves
the fix with a complete, real, unassisted live run — see
[evidence/sdk-upgrade-resolution.md](evidence/sdk-upgrade-resolution.md) for exactly what changed
and the full evidence, including the actual generated report in
[evidence/sample-report/](evidence/sample-report/).

```bash
npm run dev -- octocat Hello-World 1
```

runs end-to-end: PR fetch → per-file fetch/write → all 3 subagents invoked → aggregated,
Zod-validated report written to `reports/<owner>_<repo>_<pr-number>.{json,md,html}`. `npm run
build` and `npm test` (29/29, 1 intentionally-skipped integration test) are clean.

**Still open, independent of the SDK:** the assignment's actual target,
`airaamane/simple-todo-app`, does not exist on GitHub (confirmed via `gh api
repos/airaamane/simple-todo-app` → 404, `gh search repos`, and checking the `airaamane` account
directly, which has zero public repos). This blocks the "9 PR analysis reports" deliverable
regardless of which SDK version is used — worth raising with the course/mentor. Once a real
target is confirmed, generating its reports is the same command shown above.