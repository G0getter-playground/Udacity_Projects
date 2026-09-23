# System 1 evidence — Insurance Claims Intake Agent

Solution path: `../../Build a Claims Intake Agent with a stop_reason-Driven Loop/exercises/03-dynamic-decomposition/solution/`

## Captured already (no API key needed)

- `pytest-logs/system1-claims-intake.txt` (parent `evidence/pytest-logs/`) — **29/29 passed**,
  run against the solution path above in a fresh venv (`pip install -e ".[dev]"`).

## Pending — run this in your VM with `ANTHROPIC_API_KEY` set

This system's `client.py` calls `make_client()`, which raises immediately if
`ANTHROPIC_API_KEY` isn't set — there's no offline fallback, so this step needs a real
key and a small real spend (Haiku model, 8 short fixture claims — a few cents).

```bash
cd "Build a Claims Intake Agent with a stop_reason-Driven Loop/exercises/03-dynamic-decomposition/solution"
python -m venv .venv && source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -e ".[dev]"
export ANTHROPIC_API_KEY=sk-ant-...

python -m claims_intake.run --all
```

This creates `runs/<timestamp>/` with `summary.md`, `traces/*.jsonl` (one per claim,
turn-by-turn `stop_reason`), `queues/*.jsonl`, and `escalations.jsonl`.

**After it runs, copy back into this folder:**
1. `runs/<timestamp>/summary.md`
2. One trace file from `runs/<timestamp>/traces/` (any claim)

**Then fill in these reflection-brief answers**, which need real numbers this run
produces (everything else in the brief is already answered from source + the
offline evidence above):

- **Q1** — quote the `stop_reason` sequence from the trace you copied in.
- **Q4** — quote the turn count and `est_cost_usd` for one claim from `summary.md`,
  and compare to the course README's sample numbers.
