# System 4 evidence — Multi-Shift Quality Monitoring

Solution path: `../../Build a Multi-Shift Quality Monitoring System with Claude Orchestration/04-fork-scratchpad/solution/`

Fully offline — no API key used. `shift_monitor` was run with `--recorded-response`
(a pre-scripted assistant reply), which is the project's own documented way to
exercise the pipeline at zero API spend.

- `pytest-logs/system4-shift-monitor.txt` (parent `evidence/pytest-logs/`) — 33/33 passed.
- [`shift_output.txt`](shift_output.txt) — warm tier seeded with the 40-row `fixtures/defects.json`,
  then `run-shift --shift C --warm-db data/warm.sqlite --since 2026-04-01T00:00:00Z --recorded-response fixtures/recorded_responses/shift_C_2026-04-30.json`.
  Log line: `run_shift done: shift=C new=17` — 17 of 40 warm-tier rows returned.
  (Note: the command's documented default `--since` is "8h ago" relative to wall-clock
  time; on this machine that's August 2026, after every fixture defect. Left at the
  default it legitimately returns 0 rows — still a correctly-scoped SQL query, just an
  empty result. `--since 2026-04-01T00:00:00Z` was added to land inside the fixture's
  March–April 2026 date range so the evidence shows a real non-empty slice. See
  reflection brief Q19.)
- [`explain_query_plan.txt`](explain_query_plan.txt) — `EXPLAIN QUERY PLAN` for the same
  query: `SEARCH defects USING INDEX idx_defects_ts (ts>?)` — confirms the 17-of-40 slice
  is an indexed SQL filter, not a Python-side scan of the full warm tier.
- [`hot_state.json`](hot_state.json) / [`hot_state_size.txt`](hot_state_size.txt) — 980 bytes,
  well under the ~5 KB budget, holding only the 17 most recent defect hashes, the
  current summary, active alerts, and threshold statuses.
- [`shift_scratchpad.jsonl`](shift_scratchpad.jsonl) — one append-only line per shift run.
- [`fork_demo.txt`](fork_demo.txt) — exercised the fork path end-to-end: forked two
  competing hypotheses (`lot-2026-0430-B-defective`, `capacitor-c7-tooling-wear`) off
  the same 980-byte base state, wrote an independent scratchpad entry into each fork,
  merged both findings back into the main scratchpad (1 line → 3 lines) — and confirmed
  the main `hot_state.json` was still 980 bytes and byte-identical afterward, i.e. the
  investigation never touched the base state it forked from.
