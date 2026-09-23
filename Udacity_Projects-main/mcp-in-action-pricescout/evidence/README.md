# Evidence

`verified-offline.md` — what's already confirmed correct without spending anything.

## Pending — needs your own live run

This project has no test suite; the only way to prove it works is to actually
run it, which needs a real `ANTHROPIC_API_KEY` (or Vocareum `voc-...` key +
`ANTHROPIC_BASE_URL=https://claude.vocareum.com`) and a real `FIRECRAWL_API_KEY`
(free signup at firecrawl.dev — has to be you, an API key isn't something
anyone else can create on your behalf). Udacity's own rubric also wants actual
screenshot images, which nothing here can produce for you — only your own
terminal, screenshotted by you, satisfies that.

1. `cd mcp-in-action-pricescout`, add `.env` with both keys (see README.md).
2. `uv venv && uv sync`
3. `python starter_client.py`
4. Run, and screenshot, in order:
   - `scrape these sites: {'cloudrift': 'https://www.cloudrift.ai/inference', 'deepinfra': 'https://deepinfra.com/pricing', 'fireworks': 'https://fireworks.ai/pricing#serverless-pricing', 'groq': 'https://groq.com/pricing'}`
     → **Screenshot 1**: the command plus the `Successfully scraped 4 out of 4 websites` line.
   - `Compare cloudrift ai and deepinfra's costs for deepseek v3`
     → **Screenshot 2**: the command plus the full natural-language answer.
   - `show data`
     → **Screenshot 3**: the command plus the printed pricing-plan table.
5. Paste the three screenshots in order into a doc named `evidence.pdf` or
   `evidence.md` in the project folder — that's the fourth required submission
   file alongside the code.

Once you've done this, if you want, send me the three outputs (or the
screenshots) and I'll fold real citations into this evidence folder and the
README.

## For the actual Udacity zip (separate from this GitHub copy)

This GitHub copy already excludes `.env`, `.venv/`, `__pycache__/`, `test.db`,
and `scraped_content/` via `.gitignore` — but Udacity wants an actual `.zip` of
the project folder, not a GitHub link. After you've got your evidence file:

1. Delete from your **working copy** (not this repo): `.env`, `test.db`,
   `scraped_content/`, `.venv/`, any `__pycache__/`.
2. Confirm present: `evidence.pdf`/`evidence.md`, `starter_server.py`,
   `starter_client.py`, `server_config.json`, `pyproject.toml`, `uv.lock`,
   `README.md`.
3. Zip the folder as `mcp_project_submission.zip`, then unzip it somewhere else
   and check the same list before submitting.
