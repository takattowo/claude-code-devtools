import { describe, it, expect } from 'vitest';
import { Store, Normalizer, Redactor } from '@cli-talker/core';
import { buildApp } from '../app.js';

describe('sessions routes', () => {
  it('GET /api/sessions returns empty list initially', async () => {
    const store = Store.openInMemory();
    const norm = new Normalizer(store);
    const app = await buildApp({ store, watcher: null, normalizer: norm });
    const res = await app.inject({ method: 'GET', url: '/api/sessions' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ sessions: [] });
    await app.close();
  });

  it('GET /api/sessions returns inserted sessions', async () => {
    const store = Store.openInMemory();
    const norm = new Normalizer(store);
    norm.apply({
      type: 'session-start',
      session: { id: 's1', adapter: 'c', cwd: '/x', startedAt: 1, endedAt: null, model: 'opus', status: 'active', meta: {} },
    });
    const app = await buildApp({ store, watcher: null, normalizer: norm });
    const res = await app.inject({ method: 'GET', url: '/api/sessions' });
    expect(res.json().sessions).toHaveLength(1);
    await app.close();
  });

  it('GET /api/sessions/:id/turns and tool-calls return arrays', async () => {
    const store = Store.openInMemory();
    const norm = new Normalizer(store);
    norm.apply({ type: 'session-start', session: { id: 's1', adapter: 'c', cwd: '/x', startedAt: 1, endedAt: null, model: 'opus', status: 'active', meta: {} } });
    norm.apply({ type: 'turn-start', turn: { id: 't1', sessionId: 's1', index: 0, role: 'user', startedAt: 1, endedAt: 1, text: 'hi', tokens: { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 }, parentTurnId: null } });
    norm.apply({ type: 'tool-call', call: { id: 'tc1', turnId: 't1', sessionId: 's1', index: 0, name: 'Read', input: {}, output: 'd', status: 'success', startedAt: 1, endedAt: 1, durationMs: 0, errorMessage: null, filePath: '/a' } });
    const app = await buildApp({ store, watcher: null, normalizer: norm });
    expect((await app.inject({ method: 'GET', url: '/api/sessions/s1/turns' })).json().turns).toHaveLength(1);
    expect((await app.inject({ method: 'GET', url: '/api/sessions/s1/tool-calls' })).json().toolCalls).toHaveLength(1);
    await app.close();
  });

  it('redactor scrubs turn text and tool-call output', async () => {
    const store = Store.openInMemory();
    const norm = new Normalizer(store);
    norm.apply({ type: 'session-start', session: { id: 's1', adapter: 'c', cwd: '/x', startedAt: 1, endedAt: null, model: 'opus', status: 'active', meta: {} } });
    norm.apply({ type: 'turn-start', turn: { id: 't1', sessionId: 's1', index: 0, role: 'user', startedAt: 1, endedAt: 1, text: 'token TOPSECRET123 here', tokens: { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 }, parentTurnId: null } });
    norm.apply({ type: 'tool-call', call: { id: 'tc1', turnId: 't1', sessionId: 's1', index: 0, name: 'Read', input: { path: 'TOPSECRET123' }, output: 'TOPSECRET123 leaked', status: 'success', startedAt: 1, endedAt: 1, durationMs: 0, errorMessage: 'TOPSECRET123 in error', filePath: '/a' } });
    const redactor = new Redactor({ patterns: ['TOPSECRET\\d+'], includeDefaults: false });
    const app = await buildApp({ store, watcher: null, normalizer: norm, redactor });
    const turns = (await app.inject({ method: 'GET', url: '/api/sessions/s1/turns' })).json().turns;
    expect(turns[0].text).toBe('token [REDACTED] here');
    const calls = (await app.inject({ method: 'GET', url: '/api/sessions/s1/tool-calls' })).json().toolCalls;
    expect(calls[0].input).toEqual({ path: '[REDACTED]' });
    expect(calls[0].output).toBe('[REDACTED] leaked');
    expect(calls[0].errorMessage).toBe('[REDACTED] in error');
    await app.close();
  });

  it('no redaction when redactor disabled (default)', async () => {
    const store = Store.openInMemory();
    const norm = new Normalizer(store);
    norm.apply({ type: 'session-start', session: { id: 's1', adapter: 'c', cwd: '/x', startedAt: 1, endedAt: null, model: 'opus', status: 'active', meta: {} } });
    norm.apply({ type: 'turn-start', turn: { id: 't1', sessionId: 's1', index: 0, role: 'user', startedAt: 1, endedAt: 1, text: 'sk-ant-api03-AAAAAAAAAAAAAAAAAAAA', tokens: { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 }, parentTurnId: null } });
    const app = await buildApp({ store, watcher: null, normalizer: norm });
    const turns = (await app.inject({ method: 'GET', url: '/api/sessions/s1/turns' })).json().turns;
    expect(turns[0].text).toBe('sk-ant-api03-AAAAAAAAAAAAAAAAAAAA');
    await app.close();
  });
});
