# Reflection Brief — Harness Engineering Capstone

**Name:** Nithin Swa
**Date:** 2026-08-25

**Environment**

- Model(s): `claude-haiku-4-5-20251001` (default model for Systems 1, 2, 4). System 3's validator makes no model calls.
- OS / Python: Windows 11, Python 3.12.10.
- Approx. API spend: **$0 so far.** Systems 3 and 4 were run to completion here with no API key (System 3 is a static validator; System 4 was run offline with `--recorded-response`). Systems 1 and 2 make real API calls and are run in the learner's own environment — see `evidence/system-1-claims-intake/README.md` and `evidence/system-2-retail-context/README.md` for the exact pending steps; course README estimates $1–5 total once run.

All file paths below are relative to this folder (`Project-Harness Engineering with Claude and Claude Code/`), matching the course repo's own layout — e.g. `../Build a Claims Intake Agent with a stop_reason-Driven Loop/exercises/03-dynamic-decomposition/solution/`.

---

## Part 1 — Per-system

### System 1 — Agentic loop

1. **Loop control.**
   → The dispatch lives in [`../Build a Claims Intake Agent with a stop_reason-Driven Loop/exercises/03-dynamic-decomposition/solution/claims_intake/loop.py`](<../Build a Claims Intake Agent with a stop_reason-Driven Loop/exercises/03-dynamic-decomposition/solution/claims_intake/loop.py>), function `run()`. After each `client.messages.create()` call it checks `response.stop_reason`: `== "end_turn"` returns `FinalState` immediately; `== "tool_use"` executes every tool call in the response, appends the results as a `user` turn, and `continue`s the `while True:`; anything else raises `UnexpectedStopReason`. There is no other exit path — no turn counter, no text-content check. **PENDING real trace:** once `python -m claims_intake.run --all` is run (see `evidence/system-1-claims-intake/README.md`), paste in the actual per-turn `stop_reason` sequence from `runs/<timestamp>/traces/<claim>.jsonl` here.

2. **Anti-pattern.**
   → `tests/test_antipatterns.py::test_no_integer_literal_iteration_cap_in_loop` (part of the 29/29 in `evidence/pytest-logs/system1-claims-intake.txt`) statically AST-walks `loop.py` and fails if it finds a `for _ in range(<int>)` or `while x < <int>` cap. If the loop instead used `for _ in range(5)` as its stopping mechanism, a claim that genuinely needs a 6th turn (e.g. two clarifying questions plus lookup, classify, severity, and route) would be silently cut off mid-investigation with no terminal tool called — `session.terminal_called` would be `False`, `run.py`'s `any_failure` flag would trip, but the claim would just vanish with no `routed`/`escalated` record and no explanation of why, instead of the current design where an open-ended budget (`Budget`, checked via `budget.check()`) is the only thing that can stop the loop short, and it does so by raising, not by silently truncating.

3. **Tool design.**
   → `route_to_adjuster` and `escalate_to_human` in [`claims_intake/tools.py`](<../Build a Claims Intake Agent with a stop_reason-Driven Loop/exercises/03-dynamic-decomposition/solution/claims_intake/tools.py>) are the two terminal tools — both take a `queue`/`reason` plus a summary, i.e. overlapping shape (both "how does this claim end"). Their descriptions prevent misrouting by stating disjoint preconditions in plain language: `route_to_adjuster`'s description requires "classification confidence is at least 0.6 and severity has been assessed," while `escalate_to_human`'s says to use it "when classification confidence is below 0.6... or when the claim cannot be routed safely." A structured tool error shows this precondition being enforced, not just suggested: `_t_route_to_adjuster` returns `_err("permanent", False, "classify_claim must be called before routing")` — a JSON object with `is_error`, `error_category`, and `is_retryable` — which lets the agent tell *why* the call failed and self-correct (call `classify_claim` first) in its next turn. A bare string like `"Error: cannot route"` would give it no `is_retryable` signal and no structured reason to act on, only vibes.

4. **Your numbers.**
   → **PENDING** — needs `runs/<timestamp>/summary.md` from the live run. Once available, quote one claim's `turns` and `est_cost_usd` column and compare to the course README's sample.

### System 2 — Context strategy

5. **The reduction.**
   → **PENDING** — needs `budget.json` from `python -m retail_context.run --all` (see `evidence/system-2-retail-context/README.md`). What's already established from code: by contract in [`retail_context/assemble.py`](<../Engineer a Long-Conversation Context Strategy for a Retail Support Copilot/04-assemble-and-locate/solution/retail_context/assemble.py>), the Case Facts block is capped at ≤600 tokens and each Resolved section at ≤500 tokens, while the Active issue section is the one kept byte-exact verbatim (`active_raw_text`) — it sits at the bottom boundary, directly against the new user turn, which is the highest-attention position for a model reasoning about what to do *next*.

6. **Summarize vs preserve.**
   → The rule, per `assemble.py`'s own docstring: Case Facts (top boundary) is structured and dense — extracted once via an LLM call in [`case_facts.py`](<../Engineer a Long-Conversation Context Strategy for a Retail Support Copilot/04-assemble-and-locate/solution/retail_context/case_facts.py>) into 12 required fields (`REQUIRED_FIELDS`), never re-summarized, because a scratchpad-style fact block is the thing everything else gets checked against. Resolved issues (the middle) get compressed under a token budget because they're historical narrative in the lowest-attention zone. The Active issue (bottom boundary) is preserved byte-exact — `test_active_segment_byte_exact` in `tests/test_assemble.py` (passing, see `evidence/pytest-logs/system2-retail-context.txt`) enforces this structurally, not just by convention. **PENDING per-section numbers** from `budget.json` to cite alongside this rule.

7. **Facts block.**
   → **PENDING** — needs `eval.jsonl` and `eval_control.jsonl` from the live run. Once available, cite which of the 6 eval questions passes against the full assembled context but fails against the case-facts-stripped control, and state what that proves (that the persistent facts block, not the narrative, is what the model actually needs to answer that class of question).

### System 3 — Claude Code config

8. **Path-scoped rules.**
   → From `evidence/system-3-ecommerce-team-config/claude_structure.txt`:
   ```
   ---
   description: Conventions for React components and pages
   paths:
     - "src/components/**/*"
     - "src/pages/**/*"
   ---
   ```
   This is better than a directory-level `CLAUDE.md` for a cross-cutting convention because the glob, not a directory boundary, defines the scope. `tests.md`'s frontmatter (`"**/*.test.tsx"`, `"**/*.test.ts"`) matches test files *anywhere* in the tree — `src/components/Cart/Cart.test.tsx` matches both `react.md` and `tests.md` simultaneously (confirmed by the passing `test_ac_02_06_test_file_matches_react_and_tests`, evidence/pytest-logs). A single `src/components/CLAUDE.md` could never express "also apply to every `*.test.ts` file regardless of directory."

9. **Forked skill.**
   → From `claude_structure.txt`, `.claude/skills/deploy-check/SKILL.md`:
   ```
   context: fork
   ...
   allowed-tools:
     - Read
     - Grep
     - Glob
     - Bash(git status:*)
     - Bash(git diff:*)
     - Bash(git log:*)
     - Bash(git rev-parse:*)
     - Bash(git ls-files:*)
     - Bash(gh pr view:*)
   ```
   `CLAUDE.md` itself states the reason: "read-only pre-deployment validation, runs in a forked sub-agent **to keep its output out of your main session**." Running forked buys isolation — a multi-file deploy check's intermediate reasoning doesn't pollute the main conversation's context; running read-only means a pre-deploy check can never itself mutate the repo it's inspecting. Without `context: fork`, every file it reads and every git command it runs would burn tokens in the primary session; without the read-only allowlist, nothing would stop the "check" from being able to `git commit` or edit files mid-validation, which defeats the point of a check.

10. **Scope.**
    → From [`CLAUDE.md`](<../Configure Claude Code for a Multi-Surface Monorepo Team/04-plan-mode-and-explore-decision-doc/solution/CLAUDE.md>)'s own scope table: **project-level** is `./CLAUDE.md`, `.claude/standards/`, `.claude/rules/` — "Lives in git. Shared with the whole team," e.g. `.claude/standards/testing.md`'s repo-wide rule that "Mocking the DB layer is forbidden — we got burned by a mocked test that hid a broken migration." **User-level** is `~/.claude/CLAUDE.md` etc. — "personal preferences... never reach teammates," e.g. the doc's own example of "your preferred commit-message style" or a personal `/morning` command, deliberately kept out of this repo. The validator's `test_ac_01_05_documents_scope_and_user_level_not_versioned` (passing) checks this distinction is actually written down, not just implied.

### System 4 — Orchestration

11. **Push work down.**
    → `evidence/system-4-shift-monitor/explain_query_plan.txt`: `EXPLAIN QUERY PLAN` for the same query used by `run-shift` reports `SEARCH defects USING INDEX idx_defects_ts (ts>?)` — this is `WarmStore.defects_since()` in [`shift_monitor/warm.py`](<../Build a Multi-Shift Quality Monitoring System with Claude Orchestration/04-fork-scratchpad/solution/shift_monitor/warm.py>), whose own docstring states "SQL-side filtering only — no Python-side filtering." Against the 40-row `fixtures/defects.json` warm tier, the shift run returned **17** rows (`evidence/system-4-shift-monitor/shift_output.txt`: `run_shift done: shift=C new=17`) — a 17-of-40 slice, not the full table. The model never sees the full history because the invocation only ever gets what the SQL query already filtered to a bounded `limit` (50) of recent rows; the warm tier can grow to millions of rows and the per-shift prompt stays the same size, because the index (not the model's context window) is what scales.

12. **Crash recovery.**
    → [`shift_monitor/recovery.py`](<../Build a Multi-Shift Quality Monitoring System with Claude Orchestration/04-fork-scratchpad/solution/shift_monitor/recovery.py>): `decide()` returns `"resume"` only if the manifest has incomplete steps *and* the last step's timestamp is within `STALE_RESUME_THRESHOLD_MINUTES = 30` of now; otherwise `"fresh"`. The module docstring gives the reasoning directly: 30 minutes is "~1/16 of an 8-hour shift cycle" — a resume inside that window is "still operating on the same shift's working set," while anything older is "a stale partial that should be re-started from scratch with whatever findings the manifest already captured injected as a summary." A fresh start with an injected summary is more reliable than blindly resuming because a manifest that's been sitting for hours may reflect stale defect data or a reasoning chain that no longer matches the current warm-tier state — restarting with a synthesized summary of what was already found avoids silently building on top of possibly-outdated intermediate conclusions.

13. **Small state.**
    → `evidence/system-4-shift-monitor/hot_state.json` is **980 bytes** (`hot_state_size.txt`), against the `HOT_STATE_BYTE_BUDGET` enforced by `_trim_to_budget()` in `pipeline.py` (~5 KB). This matters because `shift_monitor` runs once per 8-hour shift *indefinitely* — after 1,000 shifts, `hot_state.json` must be exactly as small as after 1 shift, since it's re-read and re-injected into every new invocation's prompt. `recent_defect_hashes` is explicitly capped (`MAX_RECENT_HASHES`, `_new_hashes()` truncates on insert) rather than allowed to grow — the mechanism that keeps System 4 cheap forever is the same "bound what persists" principle as System 2's per-section token caps, just enforced in bytes across invocations instead of in tokens within one.

---

## Part 2 — Synthesis

14. **Three layers.**
    → **Model:** [`claims_intake/tools.py`](<../Build a Claims Intake Agent with a stop_reason-Driven Loop/exercises/03-dynamic-decomposition/solution/claims_intake/tools.py>) — `TOOL_SCHEMAS`, the seven tool definitions with their `input_schema`s and natural-language descriptions, are the entire decision surface the model reasons over; which tool to call and when is never decided in Python (enforced by `test_no_claim_type_equality_branching_in_package`, passing).
    → **Harness:** [`claims_intake/loop.py`](<../Build a Claims Intake Agent with a stop_reason-Driven Loop/exercises/03-dynamic-decomposition/solution/claims_intake/loop.py>) — `run()`, the `stop_reason`-driven `while True:` that turns one model decision into the next API call, is the harness: it doesn't decide claim outcomes, it just keeps the model in the loop until it stops itself.
    → **Orchestration:** [`shift_monitor/pipeline.py`](<../Build a Multi-Shift Quality Monitoring System with Claude Orchestration/04-fork-scratchpad/solution/shift_monitor/pipeline.py>) — `run_shift()` is Layer 3: it doesn't run a loop at all, it's a single bounded invocation (`gather_new_defects` → `build_rich_prompt` → one `client.complete()` call → `write_atomic`) that gets called once per shift, with tiered state (`HotState`/`WarmStore`) carrying context *across* invocations instead of within one.

15. **Deterministic vs prompt.**
    → **Deterministic (code):** `HotState.write_atomic()` plus `_trim_to_budget()` in `pipeline.py` — the ~5 KB byte budget is enforced by Python popping alerts off the list until the serialized JSON fits, regardless of what the model wrote; the evidence in `evidence/system-4-shift-monitor/hot_state.json` (980 bytes) holds no matter how verbose a given model response is.
    → **Prompt-guided:** `classify_claim`'s tool description in `claims_intake/tools.py` — "If confidence is below 0.6, prefer escalate_to_human" — is advisory text. `_t_classify_claim`'s own validation only checks `0.0 <= confidence <= 1.0`; nothing in code stops the model from calling `route_to_adjuster` at confidence 0.55.
    → Deterministic enforcement is right when a violation is expensive or silent (a >5 KB hot-state file that never gets caught until a shift's prompt quietly balloons); prompt guidance is right for a judgment call the model is actually equipped to make (confidence is the model's own self-assessment — Python can't second-guess it without becoming the classifier itself).

16. **Context, two faces.**
    → System 2 manages context *within* one long conversation — pruning tool output, compressing resolved segments, budgeting by token count (§5 above, per-section caps: Case Facts ≤600, each Resolved ≤500 — numbers pending the live run). System 4 manages context *across* separate invocations that never share a conversation at all — each shift is one fresh API call, and what "persists" is a 980-byte `hot_state.json` (§13) plus a bounded warm-tier SQL query (§11), not a rolling transcript. Same principle — bound what the model has to read so cost and coherence don't degrade as the underlying history grows unboundedly — applied at two different granularities: token budget inside one session vs. byte budget carried between sessions that don't otherwise talk to each other.

17. **Reliability you can't see in one run.**
    → `tests/test_us01_tiered_state.py::test_defects_since_uses_index_and_does_not_load_full_table` (part of the 33/33 in `evidence/pytest-logs/system4-shift-monitor.txt`) guarantees `WarmStore.defects_since()` always executes as an indexed `SEARCH`, never a full-table scan — and I confirmed this independently by running `EXPLAIN QUERY PLAN` myself (`evidence/system-4-shift-monitor/explain_query_plan.txt`: `SEARCH defects USING INDEX idx_defects_ts`). Against today's 40-row fixture, an accidental full scan and an indexed search are both instant — a single successful run would look identical either way. The test is what catches a regression to O(n) behavior before the warm tier has grown large enough for a scan to actually be slow in production.

18. **Blast radius.**
    → System 4. If the live model returns malformed output, `pipeline.py`'s `_parse_hot_state_update()` returns `None` on a JSON-decode failure, and `run_shift()` falls back to the *prior* `active_alerts`/`threshold_statuses` (`parsed_alerts if isinstance(parsed_alerts, list) else list(hot_state.active_alerts)`) rather than writing garbage — the blast radius of one bad response is "state doesn't update this shift," not "state gets corrupted." If a forked investigation goes wrong, `evidence/system-4-shift-monitor/fork_demo.txt` shows the main `hot_state.json` was still byte-identical (980 bytes) after two forks wrote their own scratchpad entries and were merged back — a bad fork can't touch the base state it forked from. The kill switch demonstrated throughout this evidence is `--recorded-response`: the entire pipeline runs with the live model swapped out for a scripted reply, at the same code path.

19. **What broke.**
    → Running `run-shift` with its documented default `--since` (8 hours before wall-clock "now") returned `run_shift done: shift=C new=0` — correct behavior, useless evidence, because this machine's clock is August 2026 and every row in `fixtures/defects.json` is dated March–April 2026, so nothing was ever "within the last 8 hours" of *now*. Fixed by passing `--since 2026-04-01T00:00:00Z` explicitly (a documented CLI flag, not a code change), which returned the real 17-of-40 slice used throughout this brief — documented in `evidence/system-4-shift-monitor/README.md`.

20. **What you'd change.**
    → I'd derive the default `--since` from the previous shift's own recorded timestamp (already available — `HotState`/the manifest track when the last shift ran) instead of wall-clock-relative "8 hours ago." As built, the default silently depends on *when you happen to invoke the CLI* relative to the fixture data's dates, which is exactly the kind of hidden, clock-dependent behavior the rest of this system (SQL-side filtering, byte budgets, atomic writes) is otherwise careful to avoid.
