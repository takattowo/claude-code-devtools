import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from './db/store.js';
import { Normalizer } from './normalizer.js';
import type { AdapterEvent } from './types.js';

describe('Normalizer', () => {
  let store: Store;
  let normalizer: Normalizer;
  beforeEach(() => {
    store = Store.openInMemory();
    normalizer = new Normalizer(store);
  });

  it('apply session-start writes session row', () => {
    normalizer.apply({
      type: 'session-start',
      session: {
        id: 's1', adapter: 'c', cwd: '/x', startedAt: 1, endedAt: null,
        model: 'opus', status: 'active', meta: {},
      },
    });
    expect(store.listSessions()).toHaveLength(1);
  });

  it('apply turn-start + tool-call + tool-result wires output back to call', () => {
    const events: AdapterEvent[] = [
      { type: 'session-start', session: { id: 's1', adapter: 'c', cwd: '/x', startedAt: 1, endedAt: null, model: 'opus', status: 'active', meta: {} } },
      { type: 'turn-start', turn: { id: 't1', sessionId: 's1', index: 0, role: 'assistant', startedAt: 2, endedAt: 2, text: null, tokens: { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 }, parentTurnId: null } },
      { type: 'tool-call', call: { id: 'tc1', turnId: 't1', sessionId: 's1', index: 0, name: 'Read', input: { file_path: '/a' }, output: null, status: 'pending', startedAt: 2, endedAt: null, durationMs: null, errorMessage: null, filePath: '/a' } },
      { type: 'tool-call', call: { id: 'tc1', turnId: '', sessionId: 's1', index: 0, name: '', input: undefined, output: 'data', status: 'success', startedAt: 3, endedAt: 3, durationMs: null, errorMessage: null, filePath: null } },
    ];
    for (const e of events) normalizer.apply(e);
    const calls = store.listToolCalls('s1');
    expect(calls).toHaveLength(1);
    expect(calls[0].status).toBe('success');
    expect(calls[0].output).toBe('data');
  });

  it('emits to subscribers', () => {
    const seen: AdapterEvent[] = [];
    normalizer.subscribe('s1', (e) => seen.push(e));
    normalizer.apply({ type: 'session-start', session: { id: 's1', adapter: 'c', cwd: '/x', startedAt: 1, endedAt: null, model: 'opus', status: 'active', meta: {} } });
    expect(seen).toHaveLength(1);
  });
});
