# System 2 evidence — Retail Support Context Strategy

Solution path: `../../Engineer a Long-Conversation Context Strategy for a Retail Support Copilot/04-assemble-and-locate/solution/`

## Captured already (no API key needed)

- `pytest-logs/system2-retail-context.txt` (parent `evidence/pytest-logs/`) — **28 passed,
  2 skipped**. The 2 skips are real, not flaky: `test_antipatterns.py` checks properties
  of the files `retail_context.run --build` writes (byte-exact active segment,
  section-count consistency in `budget.json`), and those files don't exist until that
  command has been run at least once. Both will pass once you run the live step below.

## Pending — run this in your VM with `ANTHROPIC_API_KEY` set

`client.py` supports two backends: the Anthropic SDK when `ANTHROPIC_API_KEY` is set,
or shelling out to a local `claude` CLI otherwise. Either avoids you needing to hand
me a key — but do it in your own environment either way, since it makes real model
calls (Haiku by default; the capstone README estimates $1–5 total across systems 1+2+4,
and system 4 was run fully offline here, so this is the bulk of that spend).

```bash
cd "Engineer a Long-Conversation Context Strategy for a Retail Support Copilot/04-assemble-and-locate/solution"
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
export ANTHROPIC_API_KEY=sk-ant-...   # or skip this and just have `claude` on PATH

python -m retail_context.run --all
pytest tests/ -v   # re-run — should now be 30/30, the 2 skips will pass
```

This creates `runs/<run_id>/` with `context.md`, `budget.json`, `case_facts_call.json`,
`eval.jsonl`, and `eval_control.jsonl`.

**After it runs, copy back into this folder:**
1. `runs/<run_id>/budget.json`
2. `runs/<run_id>/eval.jsonl`
3. `runs/<run_id>/eval_control.jsonl`

**Then fill in these reflection-brief answers**, which need real numbers this run
produces (everything else in the brief is already answered from source):

- **Q5** — baseline vs. assembled tokens and the reduction % from `budget.json`.
- **Q6** — the per-section token numbers from `budget.json`'s `section_tokens`.
- **Q7** — which question's answer differs between `eval.jsonl` and
  `eval_control.jsonl` (the control has the case-facts block stripped).
