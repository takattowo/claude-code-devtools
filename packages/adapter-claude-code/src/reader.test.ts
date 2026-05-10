import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { readChunk, ReaderState } from './reader.js';

describe('readChunk', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-talker-test-'));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('returns events from a complete file and an offset at EOF', async () => {
    const fp = path.join(tmp, 's.jsonl');
    const lines = [
      JSON.stringify({ type: 'user', sessionId: 's1', cwd: '/x', uuid: 'u1', timestamp: '2026-01-01T00:00:00Z', message: { role: 'user', content: 'hi' } }),
    ].join('\n') + '\n';
    await fs.writeFile(fp, lines);
    const state: ReaderState = { sessionId: null };
    const result = await readChunk(fp, 0, state);
    expect(result.newOffset).toBe(Buffer.byteLength(lines));
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.state.sessionId).toBe('s1');
  });

  it('holds back partial trailing lines (no newline)', async () => {
    const fp = path.join(tmp, 's.jsonl');
    const partial = '{"type":"user","sessionId"';
    await fs.writeFile(fp, partial);
    const state: ReaderState = { sessionId: null };
    const result = await readChunk(fp, 0, state);
    expect(result.newOffset).toBe(0);
    expect(result.events).toEqual([]);
  });

  it('resumes from offset, only reads new bytes', async () => {
    const fp = path.join(tmp, 's.jsonl');
    const l1 = JSON.stringify({ type: 'user', sessionId: 's1', cwd: '/x', uuid: 'u1', timestamp: '2026-01-01T00:00:00Z', message: { role: 'user', content: 'a' } }) + '\n';
    const l2 = JSON.stringify({ type: 'user', sessionId: 's1', cwd: '/x', uuid: 'u2', timestamp: '2026-01-01T00:00:01Z', message: { role: 'user', content: 'b' } }) + '\n';
    await fs.writeFile(fp, l1 + l2);
    const offsetAfterFirst = Buffer.byteLength(l1);
    const result = await readChunk(fp, offsetAfterFirst, { sessionId: 's1' });
    expect(result.newOffset).toBe(Buffer.byteLength(l1 + l2));
    expect(result.events.some(e => e.type === 'turn-start')).toBe(true);
  });
});
