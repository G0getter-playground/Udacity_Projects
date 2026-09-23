# Udacity_Projects

## [Claude AI Engineer: Harness Engineering](claude-ai-engineer-harness-engineering/)

Capstone for Udacity's `cd15315` course — four Claude harness-engineering systems (agentic loop, context strategy, Claude Code config, multi-shift orchestration), each built, tested, and run with real captured evidence, plus an evidence-grounded reflection brief.

## [MCP in Action: PriceScout](mcp-in-action-pricescout/)

Capstone for Udacity's `cd15828` course — a chatbot that orchestrates three MCP servers (a custom Firecrawl-backed scraper, a pre-built SQLite server, a pre-built filesystem server) to scrape and answer questions about competitor LLM-inference pricing, storing structured results in SQLite.

## [Claude AI Engineer: Evaluation and Observability](claude-ai-engineer-evaluation-observability/)

Capstone for Udacity's `cd15552` course — three systems built to be *trusted*: validated/routed insurance-policy extraction, resilient two-pass mortgage-document extraction, and provenance-preserving supply-chain risk synthesis. Run-only (no new code), with a real evidence pack, a perturbation log, and a reflection brief grounded in that evidence.

## [Multi-Agent Code Review Orchestrator](claude-multiagent-code-review/)

Capstone for Udacity's `cd14715` course — a Claude Agent SDK system where a main orchestrator spawns three specialized subagents (code quality, test coverage, refactoring) over MCP-fetched GitHub pull requests, aggregates their findings into a Zod-validated report, and renders it as Markdown/HTML/JSON. Runs on the course-pinned SDK version, which has a confirmed upstream bug blocking live PR review — documented in full with evidence rather than worked around.

## [Multi-Agent Code Review Orchestrator — SDK upgrade](claude-multiagent-code-review-sdk-upgrade/)

Same capstone, upgraded past the pinned SDK (plus the Zod v3→v4 migration that upgrade requires) to actually fix the bug above. Proven with a complete, real, unassisted live PR review — evidence and the generated report included.