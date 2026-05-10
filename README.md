# claude-code-devtools

> Local web app that visualizes Claude Code sessions. Live tool-call timeline, context inspector, file heatmap, replay scrubber.

Chrome-DevTools-style observability for [Claude Code](https://docs.claude.com/en/docs/claude-code/overview). Watch your agent work in real time, replay finished sessions, spot redundant reads, see where tokens go.

> Status: early. Plan 1 features shipped. Plugin + npm publish coming.

## Features

- **Live timeline.** Every tool call (Read, Edit, Bash, etc.) streams in as the agent works. Status, file, duration at a glance.
- **Context inspector.** Per-session model, token breakdown (input/output/cache read/cache create), cache hit rate, total cost.
- **File heatmap.** Sorted list of files the agent touched, with read/edit/write/error counts. Spot redundant reads.
- **Replay scrubber.** Step backward through a session turn-by-turn. Toggle "follow live" to pin to latest.
- **Resizable three-pane layout.** Sessions sidebar, main view, inspector pane. Drag dividers.
- **Multi-session aware.** Sidebar lists every session under `~/.claude/projects/`, polls live.

## Quickstart

Requires Node 20+ and pnpm.

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
cli-talker [options]

  --port <port>     preferred port (default: 7777, retries +10)
  --host <host>     bind host (default: 127.0.0.1)
  --no-open         do not auto-open the browser
```

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
| `cli-talker` | CLI binary (`commander` + `open`) that boots the server and opens the browser |

The adapter layer is pluggable. Future adapters for Codex, Cursor, Gemini CLI implement the same `AgentAdapter` interface (`discover`, `readChunk`).

## Data model

Normalized schema (every adapter maps to this):

```ts
interface Session   { id, adapter, cwd, startedAt, endedAt, model, status, meta }
interface Turn      { id, sessionId, index, role, startedAt, endedAt, text, tokens, parentTurnId }
interface ToolCall  { id, turnId, sessionId, index, name, input, output, status, startedAt, endedAt, durationMs, errorMessage, filePath }
```

Storage: `~/.cli-talker/db.sqlite`. Offsets persisted so restarts resume mid-file.

## Development

```bash
# Run server in watch mode (tsx)
pnpm --filter cli-talker dev

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

Transcripts can contain secrets (API keys, tokens, paths). The DB is at `~/.cli-talker/db.sqlite` — treat it like your shell history.

## Roadmap

- [x] Live tool-call timeline
- [x] Context inspector with token + cost stats
- [x] File heatmap
- [x] Replay scrubber
- [x] Resizable panes
- [ ] Claude Code plugin (`/devtools` slash command + hook capture)
- [ ] Import / export sessions (share debug snapshots)
- [ ] Adapters for Codex, Cursor CLI, Gemini CLI
- [ ] Redact mode (`--redact` regex list)
- [ ] npm publish (`npx claude-code-devtools`)

## License

MIT
