import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { start } from './start.js';

describe('e2e', () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-talker-e2e-'));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('ingests a session file written before start, exposes it via API', async () => {
    const projectDir = path.join(tmp, '-tmp-proj');
    await fs.mkdir(projectDir, { recursive: true });
    const sessionFile = path.join(projectDir, 'e2e-1.jsonl');
    const lines = [
      JSON.stringify({ type: 'user', sessionId: 'e2e-1', cwd: '/tmp/proj', uuid: 'u1', timestamp: '2026-05-10T10:00:00Z', message: { role: 'user', content: 'hi' } }),
      JSON.stringify({ type: 'assistant', sessionId: 'e2e-1', cwd: '/tmp/proj', uuid: 'u2', timestamp: '2026-05-10T10:00:01Z', message: { id: 'm1', type: 'message', role: 'assistant', model: 'claude-opus-4-7', content: [{ type: 'tool_use', id: 'tu1', name: 'Read', input: { file_path: '/x' } }], usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }),
    ].join('\n') + '\n';
    await fs.writeFile(sessionFile, lines);

    const dbPath = path.join(tmp, 'db.sqlite');
    const server = await start({ port: 0, dbPath, watchRoot: tmp });
    await new Promise((r) => setTimeout(r, 500));

    const sessions = await fetch(`${server.url}/api/sessions`).then((r) => r.json()) as { sessions: { id: string }[] };
    expect(sessions.sessions.some((s) => s.id === 'e2e-1')).toBe(true);

    const calls = await fetch(`${server.url}/api/sessions/e2e-1/tool-calls`).then((r) => r.json()) as { toolCalls: { name: string }[] };
    expect(calls.toolCalls.some((c) => c.name === 'Read')).toBe(true);

    await server.close();
  });
});
