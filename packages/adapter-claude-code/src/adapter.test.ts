import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClaudeCodeAdapter } from './adapter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('createClaudeCodeAdapter', () => {
  it('parses fixture file end-to-end', async () => {
    const adapter = createClaudeCodeAdapter();
    const fixturePath = path.resolve(__dirname, '../test/fixtures/happy-path.jsonl');
    const result = await adapter.readChunk(fixturePath, 0);
    expect(result.events.some(e => e.type === 'session-start')).toBe(true);
    expect(result.events.some(e => e.type === 'tool-call')).toBe(true);
    expect(result.newOffset).toBeGreaterThan(0);
  });
});
