In this project, you are going to make a chatbot to scrape LLM Inference Serving websites to research costs of serving various LLMs. You will do this by writing an MCP Server that hooks up to Firecrawl's API and saving the data in a SQLite Database. You should use the following websites to scrape:

- "cloudrift": "https://www.cloudrift.ai/inference"
- "deepinfra": "https://deepinfra.com/pricing"
- "fireworks": "https://fireworks.ai/pricing#serverless-pricing"
- "groq": "https://groq.com/pricing"

1. Make a venv with uv
2. Sync venv with pyproject.toml (`uv sync`)
3. Make an API Key on Anthropic and Firecrawl
4. Complete the 2 tool calls in `starter_server.py`
5. Change the `server_config.json` to point to your server file
6. Complete any section in `starter_client.py` that has "#complete".
7. Test using any methods taught in the course
8. Use the following prompts in your chatbot but play around with all the LLM providers in the list above: 
    - "How much does cloudrift ai (https://www.cloudrift.ai/inference) charge for deepseek v3?"
    - "How much does deepinfra (https://deepinfra.com/pricing) charge for deepseek v3"
    - "Compare cloudrift ai and deepinfra's costs for deepseek v3"

## Environment notes

Two dependency-drift issues surfaced against the packages actually resolved at
implementation time (Aug 2026), fixed rather than worked around:

- **`firecrawl-py`'s `.scrape()` has no `success` key.** The currently-installed
  `firecrawl-py` (v4.38.0, the only version whose `.scrape(url, formats=...)`
  method matches this assignment's shape) raises on failure and returns a
  `Document` with no `success` field on success — unlike the older API this
  assignment's instructions describe. `starter_server.py`'s
  `scrape_result.get("success", True)` defaults to `True` instead of `False`
  so real successful scrapes are actually detected (an explicit
  `success: false`, if a future/older version ever returns one, still works).
- **`mcp-server-sqlite` crashes against the latest `mcp` package.** Its last
  release (Apr 2025) pins `mcp[cli]>=1.6.0` with no upper bound, and current
  `mcp` releases removed the `Server.list_resources` decorator it depends on.
  `server_config.json`'s sqlite entry pins a compatible `mcp` version for that
  one subprocess only, via `uvx --with "mcp<1.10" mcp-server-sqlite ...` — this
  doesn't affect the `mcp` version this project itself uses.

If using a Vocareum-proxied Anthropic key (`voc-...`), set
`ANTHROPIC_BASE_URL=https://claude.vocareum.com` in `.env` alongside
`ANTHROPIC_API_KEY` — `starter_client.py` reads it and passes it to the
Anthropic client; leaving it unset uses the standard Anthropic API.
