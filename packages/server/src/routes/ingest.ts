import type { FastifyInstance } from 'fastify';
import type { Store } from '@cli-talker/core';

interface IngestBody {
  sessionId?: string | null;
  event?: string;
  payload?: unknown;
  ts?: number;
}

export const registerIngestRoutes = (app: FastifyInstance, store: Store): void => {
  app.post<{ Body: IngestBody }>('/api/ingest/hook', async (req, reply) => {
    const body = req.body ?? {};
    const event = typeof body.event === 'string' && body.event.length > 0 ? body.event : null;
    if (!event) {
      reply.code(400);
      return { error: 'missing event' };
    }
    const id = store.insertHookEvent({
      sessionId: body.sessionId ?? null,
      event,
      payload: body.payload ?? {},
      ts: typeof body.ts === 'number' ? body.ts : Date.now(),
    });
    return { id };
  });

  app.get<{ Querystring: { sessionId?: string; limit?: string } }>(
    '/api/hook-events',
    async (req) => {
      const sessionId = req.query?.sessionId ?? null;
      const limit = req.query?.limit ? Math.min(Number(req.query.limit), 1000) : 200;
      return { events: store.listHookEvents(sessionId, limit) };
    },
  );
};
