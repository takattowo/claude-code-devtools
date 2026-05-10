import type { FastifyInstance } from 'fastify';
import type { Store } from '@cli-talker/core';

export interface HeatmapEntry {
  filePath: string;
  count: number;
  reads: number;
  writes: number;
  edits: number;
  errors: number;
  lastTouchAt: number;
}

export const registerHeatmapRoutes = (app: FastifyInstance, store: Store): void => {
  app.get<{ Params: { id: string } }>('/api/sessions/:id/heatmap', async (req, reply) => {
    const session = store.getSession(req.params.id);
    if (!session) { reply.code(404); return { error: 'not found' }; }
    const calls = store.listToolCalls(req.params.id);
    const map = new Map<string, HeatmapEntry>();
    for (const c of calls) {
      if (!c.filePath) continue;
      let entry = map.get(c.filePath);
      if (!entry) {
        entry = {
          filePath: c.filePath,
          count: 0, reads: 0, writes: 0, edits: 0, errors: 0,
          lastTouchAt: 0,
        };
        map.set(c.filePath, entry);
      }
      entry.count += 1;
      if (c.name === 'Read') entry.reads += 1;
      else if (c.name === 'Write') entry.writes += 1;
      else if (c.name === 'Edit' || c.name === 'MultiEdit') entry.edits += 1;
      if (c.status === 'error') entry.errors += 1;
      if (c.startedAt > entry.lastTouchAt) entry.lastTouchAt = c.startedAt;
    }
    const entries = Array.from(map.values()).sort((a, b) => b.count - a.count);
    return { entries };
  });
};
