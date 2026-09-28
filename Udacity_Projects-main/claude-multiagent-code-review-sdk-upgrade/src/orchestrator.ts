import { query } from '@anthropic-ai/claude-agent-sdk';
import { mcpServersConfig } from './config/mcp.config.js';
import { codeQualityAnalyzer, testCoverageAnalyzer, refactoringSuggester } from './agents/index.js';
import { buildOrchestratorPrompt } from './prompts/index.js';
import { ReviewReportSchema, type ReviewReport } from './types/index.js';
import { ReviewError, ErrorCodes, withRetry, withTimeout } from './utils/error-handler.js';
import { logger } from './utils/logger.js';

/**
 * Orchestrator configuration options
 */
export interface OrchestratorOptions {
  /** Claude model to use. Defaults to ANTHROPIC_MODEL from the environment — never hardcoded,
   *  since the same code must work against both the Anthropic API and AWS Bedrock model IDs. */
  model?: string;
  /** Max conversation turns for the whole review (fetch PR + per-file fetch/write + 3 subagent
   *  Task calls per file + final aggregation). Multi-agent coordination needs headroom. */
  maxTurns?: number;
  /** Overall timeout for a single review, in milliseconds. */
  timeoutMs?: number;
  /** Retries for transient failures (network blips, momentary API errors). */
  maxRetries?: number;
}

const DEFAULT_MAX_TURNS = 150;
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes — multi-file, multi-agent review
// NOTE: retries do not mitigate the known blocking bug documented below (it is deterministic
// per-conversation-size, not transient) — this default only covers genuine transient failures
// (network blips, momentary API errors), which is what withRetry was designed for.
const DEFAULT_MAX_RETRIES = 2;

const ALLOWED_TOOLS = [
  'Task',
  'Read',
  'Write',
  'Grep',
  'Glob',
  // GitHub MCP (@modelcontextprotocol/server-github) — see src/config/mcp.config.ts for why
  // this specific legacy package, and its README for why these tool names (not the newer
  // "pull_request_read"-style names used by GitHub's official github-mcp-server).
  'mcp__github__get_pull_request',
  'mcp__github__get_pull_request_files',
  'mcp__github__get_file_contents',
  // ESLint MCP (@eslint/mcp) exposes exactly one tool.
  'mcp__eslint__lint-files'
];

/**
 * Main Code Review Orchestrator
 * Coordinates subagents to analyze pull requests and generate comprehensive reports
 */
export class CodeReviewOrchestrator {
  private readonly model: string;
  private readonly maxTurns: number;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(options: OrchestratorOptions = {}) {
    const model = options.model ?? process.env.ANTHROPIC_MODEL;
    if (!model) {
      throw new ReviewError(
        'No model configured. Set ANTHROPIC_MODEL in the environment or pass { model } to CodeReviewOrchestrator.',
        ErrorCodes.INVALID_CONFIG
      );
    }
    this.model = model;
    this.maxTurns = options.maxTurns ?? DEFAULT_MAX_TURNS;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  /**
   * Review a pull request using parallel subagent analysis
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   * @returns Complete review report
   */
  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewReport> {
    return withRetry(
      () =>
        withTimeout(
          () => this.runReview(owner, repo, prNumber),
          this.timeoutMs,
          `Review of ${owner}/${repo}#${prNumber} exceeded ${this.timeoutMs}ms`
        ),
      this.maxRetries
    );
  }

  private async runReview(owner: string, repo: string, prNumber: number): Promise<ReviewReport> {
    const prompt = buildOrchestratorPrompt(owner, repo, prNumber);

    const result = query({
      prompt,
      options: {
        model: this.model,
        maxTurns: this.maxTurns,
        mcpServers: mcpServersConfig,
        agents: {
          'code-quality-analyzer': codeQualityAnalyzer,
          'test-coverage-analyzer': testCoverageAnalyzer,
          'refactoring-suggester': refactoringSuggester
        },
        allowedTools: ALLOWED_TOOLS
        // outputFormat/json_schema is deliberately NOT used here: it has its own confirmed bug
        // where the schema-enforcement follow-up call can construct a request with a duplicate
        // tool_use id once the conversation has any tool_use blocks. Removing it is correct
        // regardless, but it is NOT sufficient to unblock a real review — see the KNOWN ISSUE
        // below, which is the actual blocker and lives one level deeper, inside the CLI itself.
        //
        // KNOWN ISSUE (unresolved, upstream): the pinned SDK version (0.1.77 — the newest
        // release still on the Zod v3 line this project's schemas depend on; 0.2.0+ requires
        // Zod v4, a migration out of scope for this fix) has a reproducible crash in its
        // internal "microcompact" context-management feature (confirmed by reading
        // node_modules/@anthropic-ai/claude-agent-sdk/cli.js: it fires a hidden Haiku-model
        // call once accumulated tool-result tokens cross an internal threshold). That hidden
        // call constructs a request with a duplicate tool_use id, the API 400s
        // ("tool_use ids must be unique"), the SDK mislabels the failure inconsistently
        // (SDKAssistantMessageError "unknown" or "authentication_failed" for the exact same
        // underlying error), and the CLI subprocess then exits. It reproduced on every attempt
        // (multiple fresh sessions, with and without personal Claude Code settings loaded) once
        // the conversation ran past the point of two GitHub MCP tool results — which real PRs
        // will always do, since GitHub's raw PR/file-metadata JSON is verbose enough on its own
        // to cross the threshold. Retries do not help (see DEFAULT_MAX_RETRIES above); this
        // needs either an SDK upgrade (blocked on the Zod v4 migration) or a way to disable
        // microcompact that no currently-documented Options field exposes.
      }
    });

    let lastAssistantText: string | undefined;
    let turn = 0;
    for await (const message of result) {
      logTurn(++turn, owner, repo, prNumber, message);
      if (message.type === 'assistant') {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            lastAssistantText = block.text;
          }
        }
      }
      if (message.type === 'result' && message.subtype !== 'success') {
        throw new ReviewError(
          `Orchestrator agent run did not complete successfully (${message.subtype})`,
          ErrorCodes.AGENT_FAILED,
          { subtype: message.subtype, owner, repo, prNumber }
        );
      }
    }

    if (lastAssistantText === undefined) {
      throw new ReviewError(
        'Orchestrator agent finished without producing a final text response',
        ErrorCodes.STRUCTURED_OUTPUT_FAILED,
        { owner, repo, prNumber }
      );
    }

    const parsed = ReviewReportSchema.safeParse(extractJson(lastAssistantText));
    if (!parsed.success) {
      throw new ReviewError(
        `Final report failed ReviewReport schema validation: ${parsed.error.message}`,
        ErrorCodes.STRUCTURED_OUTPUT_FAILED,
        { owner, repo, prNumber, issues: parsed.error.issues }
      );
    }

    return parsed.data;
  }
}

/**
 * Pulls the JSON object out of the orchestrator's final text response. The prompt asks for a
 * fenced ```json block; a bare JSON object (no fence) is also accepted in case the model omits
 * it. Returns undefined on malformed JSON so the caller's schema validation reports one
 * consistent error rather than this throwing a separate, less informative one.
 */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1] ?? text;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    return undefined;
  }
}

/**
 * Log a one-line summary of each SDK message as it streams in. Without this, a failed
 * run (e.g. hitting maxTurns) leaves no trace of what the agent was actually doing across
 * all those turns — costly and undiagnosable. Log level 'info' so it shows by default;
 * set LOG_LEVEL=debug for full tool inputs/outputs via the logger's own file transports.
 */
function logTurn(turn: number, owner: string, repo: string, prNumber: number, message: unknown): void {
  const context = { owner, repo, prNumber, turn };
  const m = message as {
    type?: string;
    subtype?: string;
    message?: { content?: Array<{ type: string; name?: string; input?: unknown; text?: string }> };
    error?: unknown;
  };

  if (m.type === 'assistant' && m.message?.content) {
    for (const block of m.message.content) {
      if (block.type === 'tool_use') {
        logger.info(`tool_use: ${block.name}`, { ...context, input: JSON.stringify(block.input).slice(0, 300) });
      } else if (block.type === 'text' && block.text) {
        logger.debug(`assistant text: ${block.text.slice(0, 200)}`, context);
      }
    }
    if (m.error) {
      logger.error(`assistant error: ${m.error}`, context);
    }
  } else if (m.type === 'result') {
    logger.info(`result: ${m.subtype}`, context);
  } else {
    logger.debug(`message: ${m.type}`, context);
  }
}
