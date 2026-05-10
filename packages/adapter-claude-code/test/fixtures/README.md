# Claude Code JSONL fixtures

Each `.jsonl` file is a real Claude Code session transcript with PII redacted.

## happy-path.jsonl

Minimal session: 1 user message, 1 assistant tool use (Read), 1 tool result, 1 assistant final response.

## Adding fixtures

1. Copy a real session from `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl`.
2. Run the redaction script (added in a later plan).
3. Save here with a semantic name.
