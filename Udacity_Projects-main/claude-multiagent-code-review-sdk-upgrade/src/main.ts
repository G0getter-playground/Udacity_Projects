import * as dotenv from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { CodeReviewOrchestrator } from './orchestrator.js';
import { ReportGenerator, logger } from './utils/index.js';
import { formatError } from './utils/error-handler.js';

// Load environment variables
dotenv.config();

/**
 * Main entry point for the Claude Multi-Agent Code Review System
 * Usage: npm run dev <owner> <repo> <pr-number>
 */
async function main() {
  const [owner, repo, prStr] = process.argv.slice(2);

  if (!owner || !repo || !prStr) {
    console.error('Usage: npm run dev -- <owner> <repo> <pr-number>');
    process.exit(1);
  }

  const prNumber = parseInt(prStr, 10);
  if (isNaN(prNumber) || prNumber <= 0) {
    console.error(`Invalid PR number "${prStr}": must be a positive integer.`);
    process.exit(1);
  }

  const hasAnthropicAPI = !!process.env.ANTHROPIC_API_KEY;
  const hasAWSCredentials = !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION
  );

  if (!hasAnthropicAPI && !hasAWSCredentials) {
    console.error('Authentication required. Set one of:');
    console.error('  - ANTHROPIC_API_KEY, or');
    console.error('  - AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_REGION (for Bedrock)');
    process.exit(1);
  }

  console.log(hasAnthropicAPI ? '🔐 Using Anthropic API authentication' : '🔐 Using AWS Bedrock authentication');

  if (!process.env.ANTHROPIC_MODEL) {
    console.error('ANTHROPIC_MODEL environment variable is required. Examples:');
    console.error('  - Anthropic API: ANTHROPIC_MODEL=claude-sonnet-4-5-20250929');
    console.error('  - AWS Bedrock:   ANTHROPIC_MODEL=us.anthropic.claude-sonnet-4-5-20250929-v1:0');
    process.exit(1);
  }

  try {
    const orchestrator = new CodeReviewOrchestrator();

    console.log(`\nReviewing ${owner}/${repo}#${prNumber} ...\n`);
    const report = await orchestrator.reviewPullRequest(owner, repo, prNumber);

    const reportGenerator = new ReportGenerator();
    const reportsDir = join(process.cwd(), 'reports');
    mkdirSync(reportsDir, { recursive: true });

    const baseName = `${owner}_${repo}_${prNumber}`;
    const formats: Array<{ ext: string; content: string }> = [
      { ext: 'json', content: reportGenerator.generateJSONReport(report) },
      { ext: 'md', content: reportGenerator.generateMarkdownReport(report) },
      { ext: 'html', content: reportGenerator.generateHTMLReport(report) }
    ];

    for (const { ext, content } of formats) {
      const path = join(reportsDir, `${baseName}.${ext}`);
      writeFileSync(path, content, 'utf-8');
      console.log(`✓ Saved ${path}`);
    }

    console.log(`\nDone. Overall score: ${report.summary.overallScore}/100, ${report.summary.totalFiles} file(s) reviewed.`);
  } catch (error) {
    logger.error('Review failed', { owner, repo, prNumber, error: formatError(error) });
    console.error(`\nError: ${formatError(error)}`);
    process.exit(1);
  }
}

main();
