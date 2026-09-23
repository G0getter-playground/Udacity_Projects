# SDK upgrade: what changed, and proof the microcompact bug is gone

This folder is a second submission of the same project, upgraded past the SDK version where
[known-issue-sdk-microcompact.md](known-issue-sdk-microcompact.md) was confirmed. The original,
pinned-SDK version — documented as blocked, with no upgrade attempted — is the separate
`claude-multiagent-code-review` submission. This one exists to answer the obvious next question:
does upgrading actually fix it?

## What changed

| Package | Before | After |
|---|---|---|
| `@anthropic-ai/claude-agent-sdk` | `0.1.77` (pinned `^0.1.55`) | `0.3.250` |
| `zod` | `3.x` | `4.4.3` |
| `zod-to-json-schema` | `3.22.0` | removed |

The SDK bump forces a Zod v3 → v4 migration, since `claude-agent-sdk@0.2.0`+ requires
`zod@^4.0.0` as a peer dependency. Three code changes were needed, all in `src/types/`:

1. **`z.record()` now takes two arguments.** Zod v4 requires an explicit key schema:
   `z.record(z.string())` → `z.record(z.string(), z.string())` (`report-types.ts`).
2. **`zod-to-json-schema@3.25.2` claims Zod v4 support in its peer dependency range
   (`^3.25.28 || ^4`) but doesn't actually produce correct output against it** — calling it on a
   Zod v4 `z.object()` schema returns just `{ "$schema": "..." }`, with none of the actual
   `type`/`properties`/`required` shape. Confirmed by calling it directly in isolation, not
   inferred from a failing test.
3. **Fix: use Zod v4's own built-in `z.toJSONSchema()`** instead of the third-party package,
   which produces correct, complete output and let the package be dropped entirely — one fewer
   dependency, using the now-official first-party path
   (`src/types/analysis-results.ts`, `src/types/report-types.ts`).

No other source changes were needed. `npm run build` and `npm test` (29/29, 1 skipped) are clean
on the new versions.

## Proof: a real, complete, unassisted live run

```bash
npm run dev -- octocat Hello-World 1
```

completed in full — session init through report generation, 194 SDK message turns, zero crashes,
zero misclassified errors:

- PR metadata and file list fetched via the GitHub MCP server (`get_pull_request`,
  `get_pull_request_files`), same as before.
- The changed file fetched (`get_file_contents`) and written to
  `.pr-review-workspace/octocat-Hello-World-1/README` — past the point that reliably crashed the
  old SDK.
- All three subagents actually invoked (`code-quality-analyzer`, `test-coverage-analyzer`,
  `refactoring-suggester`), each producing real, sensible, file-specific analysis — not
  placeholder output. `code-quality-analyzer` correctly flagged that the README's commands and
  descriptions run together with no delimiter; `test-coverage-analyzer` correctly recognized a
  plain-text README has no testable logic; `refactoring-suggester` correctly recognized
  documentation isn't a code-refactoring target.
- Final aggregation produced a `ReviewReport` that passed Zod validation, and
  `report-generator.ts` wrote all three output formats:

```
✓ Saved reports\octocat_Hello-World_1.json
✓ Saved reports\octocat_Hello-World_1.md
✓ Saved reports\octocat_Hello-World_1.html

Done. Overall score: 70/100, 1 file(s) reviewed.
```

The real output is preserved in [sample-report/](sample-report/) —
`octocat_Hello-World_1.{json,md,html}` — exactly as generated, not edited.

## What this does and doesn't resolve

This confirms the fix works. It does **not** resolve the separate, unrelated problem that the
assignment's actual target — `airaamane/simple-todo-app` — does not exist on GitHub (see the root
README). That's a missing course resource, not a technical blocker, and needs the course/mentor's
input regardless of which SDK version is used. Once a real target is confirmed, generating its
required reports is the same one-line command shown above.
