import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { REFACTORING_SUGGESTER_PROMPT } from '../prompts/refactoring-suggester.prompt.js';

/**
 * Identifies structural improvement opportunities for a single file: extractable
 * functions, outdated patterns, unnecessary complexity, and dead code. Returns a
 * RefactoringSuggestion. This is distinct from code-quality-analyzer, which looks
 * for defects rather than structural improvements to already-correct code.
 */
export const refactoringSuggester: AgentDefinition = {
  description:
    'Identifies structural refactoring opportunities in one source file — extractable functions, ' +
    'outdated patterns that could be modernized, unnecessary complexity, dead code, and design- ' +
    'pattern improvements — each with a concrete before/after code example and a stated benefit. ' +
    'Invoke this agent once per changed file, alongside code-quality-analyzer and ' +
    'test-coverage-analyzer, not instead of them.',
  prompt: REFACTORING_SUGGESTER_PROMPT,
  model: 'inherit',
  tools: ['Read', 'Grep', 'Glob', 'Skill']
};
