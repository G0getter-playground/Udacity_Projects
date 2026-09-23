import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for CodeReviewOrchestrator
 *
 * The Claude Agent SDK's `query()` drives a real agentic loop (spawning subagents,
 * calling MCP tools) that can't be exercised in a unit test without live API access
 * and live MCP servers. These tests mock `query()` at the module boundary and assert
 * on what the orchestrator does with its result — the same approach the SDK's own
 * docs suggest for testing code built on top of it.
 */

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}));

// Import after the mock is registered so the orchestrator picks up the mocked `query`.
const { CodeReviewOrchestrator } = await import('../src/orchestrator.js');

const validReport = {
  pullRequest: { owner: 'octocat', repo: 'Hello-World', number: 1 },
  fileReviews: [],
  summary: {
    totalFiles: 0,
    overallScore: 100,
    criticalIssues: 0,
    highPriorityTests: 0,
    refactoringOpportunities: 0
  },
  recommendations: [],
  metadata: {
    analyzedAt: '2026-01-01T00:00:00.000Z',
    duration: 1000,
    agentVersions: {}
  }
};

async function* asyncGeneratorOf(messages: unknown[]) {
  for (const message of messages) {
    yield message;
  }
}

function resultMessage(overrides: Record<string, unknown> = {}) {
  return {
    type: 'result',
    subtype: 'success',
    duration_ms: 1000,
    duration_api_ms: 900,
    is_error: false,
    num_turns: 5,
    result: 'done',
    total_cost_usd: 0.01,
    usage: {},
    modelUsage: {},
    permission_denials: [],
    uuid: 'test-uuid',
    session_id: 'test-session',
    ...overrides
  };
}

// The orchestrator reads its report from the final assistant text message (see orchestrator.ts
// for why: the SDK's outputFormat/json_schema mechanism is bugged), not from a
// `structured_output` field on the result message — these mocks mirror that real shape.
function assistantTextMessage(text: string) {
  return {
    type: 'assistant',
    message: { role: 'assistant', content: [{ type: 'text', text }] },
    parent_tool_use_id: null,
    session_id: 'test-session',
    uuid: 'test-uuid'
  };
}

function successSequence(report: unknown) {
  return [assistantTextMessage('```json\n' + JSON.stringify(report) + '\n```'), resultMessage()];
}

describe('CodeReviewOrchestrator', () => {
  const originalModel = process.env.ANTHROPIC_MODEL;

  beforeEach(() => {
    process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929';
    mockQuery.mockReset();
  });

  afterEach(() => {
    process.env.ANTHROPIC_MODEL = originalModel;
  });

  describe('Configuration', () => {
    it('should initialize with default options', () => {
      expect(() => new CodeReviewOrchestrator()).not.toThrow();
    });

    it('should throw if no model is configured', () => {
      delete process.env.ANTHROPIC_MODEL;
      expect(() => new CodeReviewOrchestrator()).toThrow(/model/i);
    });

    it('should accept custom rate limit configuration', () => {
      // "Rate limit configuration" here means the orchestrator's own tunables
      // (maxTurns/timeoutMs/maxRetries) rather than the standalone RateLimiter
      // utility, which the orchestrator does not directly own — see orchestrator.ts.
      const orchestrator = new CodeReviewOrchestrator({ maxTurns: 10, timeoutMs: 5000, maxRetries: 1 });
      expect(orchestrator).toBeInstanceOf(CodeReviewOrchestrator);
    });
  });

  describe('reviewPullRequest', () => {
    it('should build a prompt naming the PR and fetch instructions for GitHub MCP', async () => {
      mockQuery.mockReturnValue(asyncGeneratorOf(successSequence(validReport)));

      const orchestrator = new CodeReviewOrchestrator();
      await orchestrator.reviewPullRequest('octocat', 'Hello-World', 1);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const call = mockQuery.mock.calls[0][0] as { prompt: string; options: Record<string, unknown> };
      expect(call.prompt).toContain('octocat/Hello-World#1');
      expect(call.prompt).toContain('get_pull_request');
      expect(call.prompt).toContain('get_pull_request_files');
    });

    it('should spawn all 3 subagents via the Task tool', async () => {
      mockQuery.mockReturnValue(asyncGeneratorOf(successSequence(validReport)));

      const orchestrator = new CodeReviewOrchestrator();
      await orchestrator.reviewPullRequest('octocat', 'Hello-World', 1);

      const call = mockQuery.mock.calls[0][0] as { options: { agents: Record<string, unknown>; allowedTools: string[] } };
      expect(Object.keys(call.options.agents)).toEqual(
        expect.arrayContaining(['code-quality-analyzer', 'test-coverage-analyzer', 'refactoring-suggester'])
      );
      expect(call.options.allowedTools).toContain('Task');
    });

    it('should aggregate the final result message into a ReviewReport', async () => {
      mockQuery.mockReturnValue(asyncGeneratorOf(successSequence(validReport)));

      const orchestrator = new CodeReviewOrchestrator();
      const report = await orchestrator.reviewPullRequest('octocat', 'Hello-World', 1);

      expect(report).toEqual(validReport);
    });

    it('should validate the structured output with Zod and reject a malformed report', async () => {
      mockQuery.mockReturnValue(asyncGeneratorOf(successSequence({ not: 'a valid report' })));

      const orchestrator = new CodeReviewOrchestrator({ maxRetries: 1 });
      await expect(orchestrator.reviewPullRequest('octocat', 'Hello-World', 1)).rejects.toThrow(
        /schema validation/i
      );
    });

    it('should throw when the agent run fails instead of succeeding', async () => {
      mockQuery.mockReturnValue(asyncGeneratorOf([resultMessage({ subtype: 'error_max_turns' })]));

      const orchestrator = new CodeReviewOrchestrator({ maxRetries: 1 });
      await expect(orchestrator.reviewPullRequest('octocat', 'Hello-World', 1)).rejects.toThrow(
        /error_max_turns/
      );
    });
  });

  describe('Integration', () => {
    // Requires actual API keys, live MCP servers (GitHub + ESLint), and network access —
    // skipped by default. `vi.mock`/`vi.unmock` calls are hoisted to module load time by
    // vitest regardless of which function they're textually inside (including a skipped
    // test's callback), so unmocking the SDK from inside this one test would silently
    // un-mock it for every other test in this file too. To actually run this test against
    // the real SDK: delete the top-of-file `vi.mock('@anthropic-ai/claude-agent-sdk', ...)`
    // call (and this file's other tests, which depend on it staying mocked), remove
    // `.skip`, and run with real ANTHROPIC_API_KEY / GITHUB_TOKEN in the environment.
    it.skip('should review a real small PR', async () => {
      const orchestrator = new CodeReviewOrchestrator();
      const report = await orchestrator.reviewPullRequest('octocat', 'Hello-World', 1);
      expect(report.pullRequest).toEqual({ owner: 'octocat', repo: 'Hello-World', number: 1 });
    }, 15 * 60 * 1000);
  });
});
