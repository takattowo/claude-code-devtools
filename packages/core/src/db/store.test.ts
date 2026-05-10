import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from './store.js';

describe('Store', () => {
  let store: Store;
  beforeEach(() => {
    store = Store.openInMemory();
  });

  it('upserts and lists sessions', () => {
    store.upsertSession({
      id: 's1', adapter: 'claude-code', cwd: '/x', startedAt: 1, endedAt: null,
      model: 'opus', status: 'active', meta: {},
    });
    expect(store.listSessions().map(s => s.id)).toEqual(['s1']);
  });

  it('inserts turns and tool calls and lists by session', () => {
    store.upsertSession({
      id: 's1', adapter: 'c', cwd: '/x', startedAt: 1, endedAt: null,
      model: 'opus', status: 'active', meta: {},
    });
    store.insertTurn({
      id: 't1', sessionId: 's1', index: 0, role: 'user',
      startedAt: 1, endedAt: 1, text: 'hi',
      tokens: { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 },
      parentTurnId: null,
    });
    store.upsertToolCall({
      id: 'tc1', turnId: 't1', sessionId: 's1', index: 0,
      name: 'Read', input: { file_path: '/a' }, output: 'data', status: 'success',
      startedAt: 1, endedAt: 2, durationMs: 1, errorMessage: null, filePath: '/a',
    });
    expect(store.listTurns('s1').length).toBe(1);
    expect(store.listToolCalls('s1').length).toBe(1);
  });

  it('persists and restores file offsets', () => {
    store.setFileOffset('/a/b.jsonl', 42);
    expect(store.getFileOffset('/a/b.jsonl')).toBe(42);
  });

  it('upsertToolCall merges output for tool_result events with no name', () => {
    store.upsertSession({
      id: 's1', adapter: 'c', cwd: '/x', startedAt: 1, endedAt: null,
      model: 'opus', status: 'active', meta: {},
    });
    store.insertTurn({
      id: 't1', sessionId: 's1', index: 0, role: 'assistant',
      startedAt: 1, endedAt: 1, text: null,
      tokens: { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 },
      parentTurnId: null,
    });
    store.upsertToolCall({
      id: 'tc1', turnId: 't1', sessionId: 's1', index: 0,
      name: 'Read', input: { file_path: '/a' }, output: null, status: 'pending',
      startedAt: 1, endedAt: null, durationMs: null, errorMessage: null, filePath: '/a',
    });
    store.upsertToolCall({
      id: 'tc1', turnId: '', sessionId: 's1', index: 0,
      name: '', input: undefined, output: 'data', status: 'success',
      startedAt: 2, endedAt: 2, durationMs: null, errorMessage: null, filePath: null,
    });
    const calls = store.listToolCalls('s1');
    expect(calls[0].status).toBe('success');
    expect(calls[0].output).toBe('data');
    expect(calls[0].name).toBe('Read');
  });
});
