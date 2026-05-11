# claude-code-devtools

[![npm](https://img.shields.io/npm/v/claude-code-devtools.svg)](https://www.npmjs.com/package/claude-code-devtools)
[![CI](https://github.com/takattowo/claude-code-devtools/actions/workflows/ci.yml/badge.svg)](https://github.com/takattowo/claude-code-devtools/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Local web app that visualizes Claude Code sessions. Live tool-call timeline, context inspector, file heatmap, replay scrubber.
<img alt="image" src="https://github.com/user-attachments/assets/c8d2327d-ad9c-40ff-a10a-65362bca3e6b" />

Chrome-DevTools-style observability for [Claude Code](https://docs.claude.com/en/docs/claude-code/overview). Watch your agent work in real time, replay finished sessions, spot redundant reads, see where tokens go.


## Features

<img alt="image" src="https://github.com/user-attachments/assets/1b06f54e-692b-456c-92a9-c918fb896ccf" />


- **Live timeline.** Every tool call (Read, Edit, Bash, etc.) streams in as the agent works. Status, file, duration at a glance.
- **Context inspector.** Per-session model, token breakdown (input/output/cache read/cache create), cache hit rate, total cost.
- **File heatmap.** Sorted list of files the agent touched, with read/edit/write/error counts. Spot redundant reads.
- **Replay scrubber.** Step backward through a session turn-by-turn. Toggle "follow live" to pin to latest.
- **Resizable three-pane layout.** Sessions sidebar, main view, inspector pane. Drag dividers.
- **Multi-session aware.** Sidebar lists every session under `~/.claude/projects/`, polls live.

## Quickstart

Requires Node 20+.

```bash
npx claude-code-devtools
```

Or as a Claude Code plugin (`/devtools` slash command):

```
/plugin marketplace add takattowo/claude-code-devtools
/plugin install claude-code-devtools@claude-code-devtools
/devtools
```

Or from source:

```bash
git clone https://github.com/takattowo/claude-code-devtools.git
cd claude-code-devtools
pnpm install
pnpm build
node packages/cli/dist/index.js
```

Browser opens at `http://127.0.0.1:7777`.

Run any Claude Code session in another terminal. New rows appear in the timeline within ~1.5s.

## CLI flags

```
claude-code-devtools [options]

  --port <port>           preferred port (default: 7777, retries +10)
  --host <host>           bind host (default: 127.0.0.1)
  --no-open               do not auto-open the browser
  --redact <pattern>      regex to redact from API output (repeatable)
  --no-redact-defaults    disable built-in default redaction patterns
```

### Redact mode

Strip secrets from the timeline before recording a demo or sharing a snapshot. Redaction is applied at API response time, so the underlying SQLite DB is never modified — toggle off and the original data is back.

```bash
# Add a custom pattern (repeatable). Built-in patterns for common API keys
# and tokens are included automatically when --redact is used.
claude-code-devtools --redact "MY_INTERNAL_TOKEN_\d+" --redact "ACME-[A-Z0-9]+"

# Custom patterns only, no defaults.
claude-code-devtools --redact "secret_\w+" --no-redact-defaults
```

Built-in defaults match: `sk-…` / `sk-ant-…` Anthropic keys, `ghp_…` / `gho_…` / `github_pat_…` GitHub tokens, `xoxb-…` / `xoxp-…` Slack tokens, `AKIA…` AWS access keys, `AIza…` Google API keys.

## How it works

```
~/.claude/projects/<encoded-cwd>/<session-id>.jsonl
        |                                        watched by chokidar
        v
+--------------------------------------------------+
| cli-talker (Node, Fastify, SQLite)               |
|                                                  |
|  ClaudeCodeAdapter --> Normalizer --> SQLite     |
|                            |                     |
|                            v                     |
|                  Fastify HTTP + WebSocket        |
+--------------------------------------------------+
        |
        v
React SPA (Vite, TanStack Query, Tailwind)
```

Claude Code writes JSONL transcripts to `~/.claude/projects/<encoded-cwd>/`. cli-talker tails those files (offset-tracked, resumable), normalizes events into a unified schema, persists to SQLite, and broadcasts to subscribed browser tabs over WebSocket. The React frontend renders timeline, heatmap, and inspector panes.

## Architecture

pnpm monorepo, five workspace packages:

| Package | Purpose |
|---|---|
| `@cli-talker/core` | Unified types (Session, Turn, ToolCall), `AgentAdapter` interface, SQLite Store, Normalizer, pricing helper |
| `@cli-talker/adapter-claude-code` | Parses Claude Code JSONL into normalized events. Discovery + chunked reader + line parser |
| `@cli-talker/server` | Fastify HTTP+WS server, file watcher, REST routes (`/api/sessions`, `/turns`, `/tool-calls`, `/stats`, `/heatmap`), static SPA serving |
| `@cli-talker/web` | React SPA: sidebar + main pane (timeline / heatmap tabs) + right pane (inspector / detail tabs) + replay scrubber |
| `claude-code-devtools` | CLI binary (`commander` + `open`) that boots the server and opens the browser |

The adapter layer is pluggable. Future adapters for Codex, Cursor, Gemini CLI implement the same `AgentAdapter` interface (`discover`, `readChunk`).

## Data model

Normalized schema (every adapter maps to this):

```ts
interface Session   { id, adapter, cwd, startedAt, endedAt, model, status, meta }
interface Turn      { id, sessionId, index, role, startedAt, endedAt, text, tokens, parentTurnId }
interface ToolCall  { id, turnId, sessionId, index, name, input, output, status, startedAt, endedAt, durationMs, errorMessage, filePath }
```

Storage: `~/.claude-code-devtools/db.sqlite`. Offsets persisted so restarts resume mid-file.

## Development

```bash
# Run server in watch mode (tsx)
pnpm --filter claude-code-devtools dev

# Run frontend with HMR (proxies API + WS to backend on :7777)
pnpm --filter @cli-talker/web dev

# Tests
pnpm test          # 32 tests across core, adapter-claude-code, server

# Type-check
pnpm typecheck

# Lint
pnpm lint

# Full build
pnpm build         # produces packages/server/public + per-package dist/
```

## Privacy

All data stays local. No network calls except the chokidar file watcher reading your home directory. SQLite + transcripts never leave your machine.

Transcripts can contain secrets (API keys, tokens, paths). The DB is at `~/.claude-code-devtools/db.sqlite` — treat it like your shell history.

## Roadmap

- [x] Live tool-call timeline
- [x] Context inspector with token + cost stats
- [x] File heatmap
- [x] Replay scrubber
- [x] Resizable panes
- [x] Claude Code plugin — `/devtools` slash command, `devtools` skill, and hook capture (`SessionStart`/`PostToolUse`/`UserPromptSubmit`/`Stop` → `POST /api/ingest/hook`)
- [ ] Import / export sessions (share debug snapshots)
- [ ] Adapters for Codex, Cursor CLI, Gemini CLI _(deferred — Claude Code focus first)_
- [x] Redact mode (`--redact` regex list)
- [x] npm publish (`npx claude-code-devtools`)
- [x] Filter & search (cwd, model, status, date range, free-text, tool, file, errors)
- [x] Dashboard view (totals, cost-by-model, top tools, top files)

## License

MIT
