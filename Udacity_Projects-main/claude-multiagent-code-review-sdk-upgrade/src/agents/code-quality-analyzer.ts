import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { CODE_QUALITY_ANALYZER_PROMPT } from '../prompts/code-quality-analyzer.prompt.js';

/**
 * Analyzes a single file for security vulnerabilities, performance issues, and
 * maintainability concerns. Returns a CodeQualityResult.
 */
export const codeQualityAnalyzer: AgentDefinition = {
  description:
    'Analyzes one source file for security vulnerabilities, performance problems, and ' +
    'maintainability issues, using Claude Skills for language-specific and security-specific ' +
    'guidance. Invoke this agent once per changed file in the pull request to get a structured ' +
    'CodeQualityResult (per-line issues with severity and category, an overall score, and a summary).',
  prompt: CODE_QUALITY_ANALYZER_PROMPT,
  model: 'inherit',
  tools: ['Read', 'Grep', 'Glob', 'Skill']
};
