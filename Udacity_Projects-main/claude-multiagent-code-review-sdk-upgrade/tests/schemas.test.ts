import { describe, it, expect } from 'vitest';
import {
  CodeQualityResultSchema,
  TestCoverageResultSchema,
  RefactoringSuggestionSchema,
  CodeQualityResultJSONSchema,
  TestCoverageResultJSONSchema,
  RefactoringSuggestionJSONSchema,
  ReviewReportSchema,
  ReviewReportJSONSchema
} from '../src/types/index.js';

const validCodeQuality = {
  file: 'src/foo.ts',
  issues: [
    {
      line: 12,
      severity: 'high' as const,
      category: 'security' as const,
      description: 'User input concatenated directly into a SQL query.',
      suggestion: 'Use a parameterized query.'
    }
  ],
  overallScore: 72,
  summary: 'One high-severity SQL injection risk found.'
};

const validTestCoverage = {
  file: 'src/foo.ts',
  hasTests: true,
  testFiles: ['src/foo.test.ts'],
  untestedPaths: [
    {
      type: 'branch' as const,
      location: 'foo() error path',
      priority: 'high' as const,
      reasoning: 'The catch block is never exercised by the existing tests.',
      suggestedTest: 'Call foo() with a rejecting promise and assert it returns the fallback value.'
    }
  ],
  coverageEstimate: 65,
  summary: 'Happy path is tested; error handling is not.'
};

const validRefactoring = {
  file: 'src/foo.ts',
  suggestions: [
    {
      type: 'extract-function' as const,
      location: 'foo(), lines 10-40',
      impact: 'medium' as const,
      description: 'The validation block can be extracted into validateInput().',
      before: 'if (!x) { throw ... } if (!y) { throw ... }',
      after: 'validateInput(x, y);',
      benefits: 'Makes foo() testable independently of its validation rules.'
    }
  ],
  summary: 'One extractable validation block.'
};

describe('CodeQualityResultSchema', () => {
  it('accepts valid data', () => {
    expect(() => CodeQualityResultSchema.parse(validCodeQuality)).not.toThrow();
  });

  it('accepts an empty issues array with a perfect score', () => {
    const clean = { ...validCodeQuality, issues: [], overallScore: 100 };
    expect(() => CodeQualityResultSchema.parse(clean)).not.toThrow();
  });

  it('accepts boundary scores of 0 and 100', () => {
    expect(() => CodeQualityResultSchema.parse({ ...validCodeQuality, overallScore: 0 })).not.toThrow();
    expect(() => CodeQualityResultSchema.parse({ ...validCodeQuality, overallScore: 100 })).not.toThrow();
  });

  it('rejects a score outside 0-100', () => {
    expect(() => CodeQualityResultSchema.parse({ ...validCodeQuality, overallScore: -1 })).toThrow();
    expect(() => CodeQualityResultSchema.parse({ ...validCodeQuality, overallScore: 101 })).toThrow();
  });

  it('rejects an invalid severity enum value', () => {
    const bad = {
      ...validCodeQuality,
      issues: [{ ...validCodeQuality.issues[0], severity: 'catastrophic' }]
    };
    expect(() => CodeQualityResultSchema.parse(bad)).toThrow();
  });

  it('rejects a missing required field', () => {
    const { summary, ...missingSummary } = validCodeQuality;
    expect(() => CodeQualityResultSchema.parse(missingSummary)).toThrow();
  });
});

describe('TestCoverageResultSchema', () => {
  it('accepts valid data', () => {
    expect(() => TestCoverageResultSchema.parse(validTestCoverage)).not.toThrow();
  });

  it('accepts an empty untestedPaths array', () => {
    expect(() =>
      TestCoverageResultSchema.parse({ ...validTestCoverage, untestedPaths: [], coverageEstimate: 100 })
    ).not.toThrow();
  });

  it('rejects an invalid priority enum value', () => {
    const bad = {
      ...validTestCoverage,
      untestedPaths: [{ ...validTestCoverage.untestedPaths[0], priority: 'urgent' }]
    };
    expect(() => TestCoverageResultSchema.parse(bad)).toThrow();
  });

  it('rejects a non-boolean hasTests', () => {
    expect(() => TestCoverageResultSchema.parse({ ...validTestCoverage, hasTests: 'yes' })).toThrow();
  });
});

describe('RefactoringSuggestionSchema', () => {
  it('accepts valid data', () => {
    expect(() => RefactoringSuggestionSchema.parse(validRefactoring)).not.toThrow();
  });

  it('accepts an empty suggestions array', () => {
    expect(() => RefactoringSuggestionSchema.parse({ ...validRefactoring, suggestions: [] })).not.toThrow();
  });

  it('rejects an invalid suggestion type enum value', () => {
    const bad = {
      ...validRefactoring,
      suggestions: [{ ...validRefactoring.suggestions[0], type: 'rewrite-everything' }]
    };
    expect(() => RefactoringSuggestionSchema.parse(bad)).toThrow();
  });
});

describe('ReviewReportSchema', () => {
  const validReport = {
    pullRequest: { owner: 'airaamane', repo: 'simple-todo-app', number: 1 },
    fileReviews: [
      {
        file: 'src/foo.ts',
        codeQuality: validCodeQuality,
        testCoverage: validTestCoverage,
        refactorings: validRefactoring
      }
    ],
    summary: {
      totalFiles: 1,
      overallScore: 72,
      criticalIssues: 0,
      highPriorityTests: 1,
      refactoringOpportunities: 0
    },
    recommendations: [
      {
        priority: 'high' as const,
        category: 'security',
        description: 'Fix the SQL injection risk in src/foo.ts before merging.',
        files: ['src/foo.ts']
      }
    ],
    metadata: {
      analyzedAt: '2026-01-01T00:00:00.000Z',
      duration: 12345,
      agentVersions: { 'code-quality-analyzer': '1.0.0' }
    }
  };

  it('accepts a fully valid report', () => {
    expect(() => ReviewReportSchema.parse(validReport)).not.toThrow();
  });

  it('accepts an empty fileReviews array (e.g. no reviewable files in the PR)', () => {
    expect(() =>
      ReviewReportSchema.parse({ ...validReport, fileReviews: [], recommendations: [] })
    ).not.toThrow();
  });

  it('rejects a fileReviews entry with a malformed nested codeQuality object', () => {
    const bad = {
      ...validReport,
      fileReviews: [{ ...validReport.fileReviews[0], codeQuality: { file: 'src/foo.ts' } }]
    };
    expect(() => ReviewReportSchema.parse(bad)).toThrow();
  });

  it('rejects a missing pullRequest.number', () => {
    const { number, ...rest } = validReport.pullRequest;
    const bad = { ...validReport, pullRequest: rest };
    expect(() => ReviewReportSchema.parse(bad)).toThrow();
  });
});

describe('JSON Schema export for SDK structured outputs', () => {
  it('CodeQualityResultJSONSchema is a valid object-typed JSON schema', () => {
    expect(CodeQualityResultJSONSchema).toMatchObject({ type: 'object' });
    expect(CodeQualityResultJSONSchema.properties).toBeTruthy();
    expect(CodeQualityResultJSONSchema.required).toEqual(
      expect.arrayContaining(['file', 'issues', 'overallScore', 'summary'])
    );
  });

  it('TestCoverageResultJSONSchema is a valid object-typed JSON schema', () => {
    expect(TestCoverageResultJSONSchema).toMatchObject({ type: 'object' });
    expect(TestCoverageResultJSONSchema.required).toEqual(
      expect.arrayContaining(['file', 'hasTests', 'testFiles', 'untestedPaths', 'coverageEstimate', 'summary'])
    );
  });

  it('RefactoringSuggestionJSONSchema is a valid object-typed JSON schema', () => {
    expect(RefactoringSuggestionJSONSchema).toMatchObject({ type: 'object' });
    expect(RefactoringSuggestionJSONSchema.required).toEqual(
      expect.arrayContaining(['file', 'suggestions', 'summary'])
    );
  });

  it('ReviewReportJSONSchema is a valid object-typed JSON schema with no dangling $ref', () => {
    expect(ReviewReportJSONSchema).toMatchObject({ type: 'object' });
    expect(ReviewReportJSONSchema.required).toEqual(
      expect.arrayContaining(['pullRequest', 'fileReviews', 'summary', 'recommendations', 'metadata'])
    );
    // $refStrategy: 'root' should have inlined every definition — no $ref should survive
    // as a top-level pointer to a definitions block the SDK wouldn't resolve.
    expect(JSON.stringify(ReviewReportJSONSchema)).not.toMatch(/"\$ref":"#\/definitions/);
  });
});
