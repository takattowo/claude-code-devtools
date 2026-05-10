import { describe, it, expect } from 'vitest';
import { Store, Normalizer } from '@cli-talker/core';
import { buildApp } from './app.js';
import { WebSocket } from 'ws';

describe('websocket broker', () => {
  it('subscribers receive events for their sessionId', async () => {
    const store = Store.openInMemory();
    const norm = new Normalizer(store);
    const app = await buildApp({ store, watcher: null, normalizer: norm });
    const url = await app.listen({ port: 0, host: '127.0.0.1' });
    const wsUrl = url.replace('http://', 'ws://') + '/ws?sessionId=s1';

    const messages: unknown[] = [];
    const client = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      client.once('open', () => resolve());
      client.once('error', (err) => reject(err));
    });
    client.on('message', (raw) => messages.push(JSON.parse(String(raw))));

    norm.apply({
      type: 'session-start',
      session: { id: 's1', adapter: 'c', cwd: '/x', startedAt: 1, endedAt: null, model: 'opus', status: 'active', meta: {} },
    });
    await new Promise((r) => setTimeout(r, 100));
    expect(messages.length).toBeGreaterThan(0);

    client.close();
    await app.close();
  });
});
