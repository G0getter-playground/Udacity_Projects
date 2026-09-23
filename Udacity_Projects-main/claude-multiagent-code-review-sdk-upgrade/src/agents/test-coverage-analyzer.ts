import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { TEST_COVERAGE_ANALYZER_PROMPT } from '../prompts/test-coverage-analyzer.prompt.js';

/**
 * Evaluates test completeness for a single file: finds its test file(s) if any,
 * identifies untested functions/branches/edge cases, and estimates coverage.
 * Returns a TestCoverageResult.
 */
export const testCoverageAnalyzer: AgentDefinition = {
  description:
    'Evaluates test completeness for one source file: locates its test file(s) via Glob, checks ' +
    'whether exported functions/classes/branches are actually exercised with meaningful ' +
    'assertions, and returns a structured TestCoverageResult listing untested paths ranked by ' +
    'priority with a specific suggested test for each. Invoke this agent once per changed file.',
  prompt: TEST_COVERAGE_ANALYZER_PROMPT,
  model: 'inherit',
  tools: ['Read', 'Grep', 'Glob', 'Skill']
};
