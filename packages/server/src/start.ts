import path from 'node:path';
import os from 'node:os';
import { promises as fs } from 'node:fs';
import { Store, Normalizer } from '@cli-talker/core';
import { createClaudeCodeAdapter } from '@cli-talker/adapter-claude-code';
import { Watcher } from './watcher.js';
import { buildApp } from './app.js';

export interface StartOptions {
  port?: number;
  host?: string;
  dbPath?: string;
  watchRoot?: string;
}

export interface StartedServer {
  url: string;
  port: number;
  close: () => Promise<void>;
}

const defaultDbPath = (): string => path.join(os.homedir(), '.claude-code-devtools', 'db.sqlite');

const tryListen = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  host: string,
  basePort: number,
): Promise<{ url: string; port: number }> => {
  let lastErr: unknown;
  for (let p = basePort; p < basePort + 10; p++) {
    try {
      const url = await app.listen({ port: p, host });
      return { url, port: p };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
};

export const start = async (opts: StartOptions = {}): Promise<StartedServer> => {
  const dbPath = opts.dbPath ?? defaultDbPath();
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  const store = Store.open(dbPath);
  const normalizer = new Normalizer(store);
  const adapter = createClaudeCodeAdapter();
  const watchRoot = opts.watchRoot ?? path.join(os.homedir(), '.claude', 'projects');
  const watcher = new Watcher({ store, normalizer, adapter, root: watchRoot });
  await watcher.start();
  const app = await buildApp({ store, watcher, normalizer });
  const host = opts.host ?? '127.0.0.1';
  const requestedPort = opts.port ?? 7777;
  let url: string;
  let port: number;
  if (requestedPort === 0) {
    url = await app.listen({ port: 0, host });
    port = (app.server.address() as import('node:net').AddressInfo).port;
    url = `http://${host}:${port}`;
  } else {
    ({ url, port } = await tryListen(app, host, requestedPort));
  }
  return {
    url,
    port,
    close: async () => {
      await app.close();
      await watcher.stop();
      store.close();
    },
  };
};
