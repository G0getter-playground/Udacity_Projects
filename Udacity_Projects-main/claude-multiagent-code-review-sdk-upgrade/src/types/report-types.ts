import { z } from 'zod';
import {
  CodeQualityResultSchema,
  TestCoverageResultSchema,
  RefactoringSuggestionSchema
} from './analysis-results';

/**
 * Complete Review Report Schema
 * Aggregates all subagent results into a unified report
 */
export const ReviewReportSchema = z.object({
  pullRequest: z.object({
    owner: z.string(),
    repo: z.string(),
    number: z.number()
  }),
  fileReviews: z.array(z.object({
    file: z.string(),
    codeQuality: CodeQualityResultSchema,
    testCoverage: TestCoverageResultSchema,
    refactorings: RefactoringSuggestionSchema
  })),
  summary: z.object({
    totalFiles: z.number(),
    overallScore: z.number(),
    criticalIssues: z.number(),
    highPriorityTests: z.number(),
    refactoringOpportunities: z.number()
  }),
  recommendations: z.array(z.object({
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    category: z.string(),
    description: z.string(),
    files: z.array(z.string())
  })),
  metadata: z.object({
    analyzedAt: z.string(),
    duration: z.number(),
    agentVersions: z.record(z.string(), z.string())
  })
});

/**
 * TypeScript type inferred from Zod schema
 */
export type ReviewReport = z.infer<typeof ReviewReportSchema>;

type JsonSchema = Record<string, unknown>;

/**
 * JSON Schema for SDK structured outputs, via Zod v4's own built-in converter — see
 * analysis-results.ts for why the third-party zod-to-json-schema package was dropped.
 * Per SDK docs: https://platform.claude.com/docs/en/agent-sdk/structured-outputs
 */
export const ReviewReportJSONSchema: JsonSchema = z.toJSONSchema(ReviewReportSchema) as JsonSchema;
