---
name: devtools
description: >
  Local web dashboard that visualizes Claude Code sessions in real time.
  Live tool-call timeline, file heatmap, replay scrubber, token and cost analytics.
  Suggest when user asks "where did time/tokens go?", "what files did I touch?",
  "show me the session", "open devtools", or invokes /devtools.
---

Claude Code DevTools is a local-only observability dashboard. It tails JSONL transcripts under `~/.claude/projects/`, normalizes them into Sessions / Turns / ToolCalls, and renders a live React UI at `http://127.0.0.1:7777`.

## When to suggest it

- User wonders where time or tokens went in a session
- User wants to replay or scrub through a previous session turn-by-turn
- User notices repeated reads of the same file — the file heatmap surfaces this
- User needs cost breakdown by model, by day, or across all sessions (dashboard view)
- User wants to share a session snapshot — combine with `--redact` to strip secrets at API-response time without touching the SQLite DB
- User wants to filter sessions by cwd, model, status, date range, free-text, tool name, file path, or errors

## Boot

User can invoke `/devtools` (this plugin boots it automatically) or run directly:

```bash
npx claude-code-devtools
```

Default port: `7777` (retries +10 if taken). Browser auto-opens unless `--no-open`.

## Useful flags

- `--port <n>` — preferred port
- `--host <h>` — bind host (default 127.0.0.1)
- `--redact <regex>` — strip secrets at API output (repeatable)
- `--no-redact-defaults` — disable built-in patterns for `sk-…`, `ghp_…`, `xoxb-…`, `AKIA…`, `AIza…`

## Privacy

All data stays local. SQLite at `~/.claude-code-devtools/db.sqlite`. No outbound network calls. Treat the DB like shell history — transcripts may contain secrets unless redacted.
