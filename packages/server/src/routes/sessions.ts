import type { FastifyInstance } from 'fastify';
import type { Store } from '@cli-talker/core';

export const registerSessionsRoutes = (app: FastifyInstance, store: Store): void => {
  app.get('/api/sessions', async () => ({ sessions: store.listSessions() }));

  app.get<{ Params: { id: string } }>('/api/sessions/:id', async (req, reply) => {
    const s = store.getSession(req.params.id);
    if (!s) { reply.code(404); return { error: 'not found' }; }
    return { session: s };
  });

  app.get<{ Params: { id: string } }>('/api/sessions/:id/turns', async (req) => ({
    turns: store.listTurns(req.params.id),
  }));

  app.get<{ Params: { id: string } }>('/api/sessions/:id/tool-calls', async (req) => ({
    toolCalls: store.listToolCalls(req.params.id),
  }));
};
