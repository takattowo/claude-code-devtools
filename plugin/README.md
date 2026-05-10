# claude-code-devtools — Claude Code plugin

Boot the [claude-code-devtools](https://github.com/takattowo/claude-code-devtools) local dashboard from inside any Claude Code session.

## Install

```
/plugin marketplace add takattowo/claude-code-devtools
/plugin install claude-code-devtools@claude-code-devtools
```

## Use

```
/devtools
```

Boots `npx claude-code-devtools@latest` in the background and opens the browser at `http://127.0.0.1:7777`.

## What this plugin provides

| Component | Purpose |
|---|---|
| `/devtools` slash command | Boots the dashboard from any session |
| `devtools` skill | Teaches Claude when to suggest the dashboard (e.g. "where did my tokens go?") |
| Hook capture | `SessionStart`, `PostToolUse`, `UserPromptSubmit`, `Stop` events POST to `http://127.0.0.1:7777/api/ingest/hook` for real-time observability |

The dashboard primarily tails JSONL transcripts under `~/.claude/projects/`. Hook capture supplements it with low-latency event ingestion when the server is running. If the server is not up, hooks silently no-op — no errors, no hangs.

### Override hook target

By default, hooks POST to `127.0.0.1:7777`. Override with environment variables:

```
CLAUDE_DEVTOOLS_HOST=192.168.1.10
CLAUDE_DEVTOOLS_PORT=7788
```

## Underlying tool

This plugin is a thin wrapper around the `claude-code-devtools` npm package. See the [main README](https://github.com/takattowo/claude-code-devtools#readme) for full feature list, CLI flags, redaction mode, and architecture.

## License

MIT
