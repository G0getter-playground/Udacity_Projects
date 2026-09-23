# What's verified without live API keys

Neither Anthropic nor Firecrawl were called for any of this — it's all either
pure-Python logic tests or real (but free) MCP-protocol wiring.

## `starter_server.py`

- **`extract_scraped_info`** — tested against a hand-built `scraped_metadata.json`
  plus fake `.txt` content files: matching by `provider_name`, by `url`, and by
  `domain` all return the correct formatted JSON with `content` populated from
  disk; a non-matching identifier returns the exact fallback message the spec
  requires.
- **`scrape_websites`** — tested against a fake Firecrawl client (one URL
  "succeeds", one "fails" by raising): the successful provider gets both
  `{provider}_markdown.txt` and `{provider}_html.txt` written, `scraped_metadata.json`
  records `content_files`/`title`/`description`/`success: true` for it, the
  failed provider is excluded from both the metadata and the returned list, and
  the log line reads `Successfully scraped 1 out of 2 websites` — matching the
  rubric's required wording pattern.

## `starter_client.py` — real 3-server connectivity test

Brought up all three actual MCP servers (`starter_server.py` via `uv run`, the
real `mcp-server-sqlite` via `uvx`, the real `@modelcontextprotocol/server-filesystem`
via `npx`) with a placeholder Anthropic key (never used for an actual API call)
and no Firecrawl key at all — neither is needed just to connect and list tools:

```
llm_inference: ['scrape_websites', 'extract_scraped_info']
sqlite: ['read_query', 'write_query', 'create_table', 'list_tables', 'describe_table', 'append_insight']
filesystem: ['read_file', 'read_text_file', 'read_media_file', 'read_multiple_files', 'write_file', 'edit_file', 'create_directory', 'list_directory', 'list_directory_with_sizes', 'directory_tree', 'move_file', 'search_files', 'get_file_info', 'list_allowed_directories']
```

This exercises `Server.initialize`, `Server.list_tools`, and — via
`DataExtractor.setup_data_tables()` — a real `Server.execute_tool("write_query", ...)`
round trip that actually created the `pricing_plans` table in a real SQLite
database through the real `mcp-server-sqlite` subprocess. That's the entire
client-side MCP plumbing (config loading, server startup, tool discovery, tool
execution with the retry loop) proven correct against real servers; the only
things that could not be exercised without real keys are the Firecrawl scrape
call itself and the Claude tool-use conversation loop in `process_query`.

This is why two real dependency-drift bugs got caught and fixed before any
money would have been spent on them — see the "Environment notes" section in
`../README.md`.
