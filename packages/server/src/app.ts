import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import type { Store, Normalizer, Redactor } from '@cli-talker/core';
import { Redactor as RedactorClass } from '@cli-talker/core';
import type { Watcher } from './watcher.js';
import { registerSessionsRoutes } from './routes/sessions.js';
import { registerStatsRoutes } from './routes/stats.js';
import { registerHeatmapRoutes } from './routes/heatmap.js';
import { registerDashboardRoutes } from './routes/dashboard.js';
import { registerWebSocket } from './ws.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface BuildAppOptions {
  store: Store;
  watcher: Watcher | null;
  normalizer: Normalizer;
  publicDir?: string;
  redactor?: Redactor;
}

export const buildApp = async (opts: BuildAppOptions): Promise<FastifyInstance> => {
  const app = Fastify({ logger: false });
  app.get('/health', async () => ({ status: 'ok' }));
  const redactor = opts.redactor ?? new RedactorClass({ includeDefaults: false });
  registerSessionsRoutes(app, opts.store, redactor);
  registerStatsRoutes(app, opts.store);
  registerHeatmapRoutes(app, opts.store);
  registerDashboardRoutes(app, opts.store);
  await registerWebSocket(app, opts.normalizer);

  const publicDir = opts.publicDir ?? path.resolve(__dirname, '../public');
  if (existsSync(publicDir)) {
    await app.register(fastifyStatic, { root: publicDir, prefix: '/', decorateReply: false });
    app.setNotFoundHandler((req, reply) => {
      if (req.raw.url?.startsWith('/api')) {
        reply.code(404).send({ error: 'not found' });
        return;
      }
      reply.sendFile('index.html');
    });
  }
  return app;
};
