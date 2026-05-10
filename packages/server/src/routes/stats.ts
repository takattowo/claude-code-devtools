import type { FastifyInstance } from 'fastify';
import type { Store } from '@cli-talker/core';
import { computeCostUsd } from '@cli-talker/core';

export const registerStatsRoutes = (app: FastifyInstance, store: Store): void => {
  app.get<{ Params: { id: string } }>('/api/sessions/:id/stats', async (req, reply) => {
    const session = store.getSession(req.params.id);
    if (!session) { reply.code(404); return { error: 'not found' }; }
    const turns = store.listTurns(req.params.id);
    const calls = store.listToolCalls(req.params.id);
    const totals = turns.reduce(
      (acc, t) => ({
        input: acc.input + t.tokens.input,
        output: acc.output + t.tokens.output,
        cacheRead: acc.cacheRead + t.tokens.cacheRead,
        cacheCreate: acc.cacheCreate + t.tokens.cacheCreate,
      }),
      { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 },
    );
    const cacheHitRate = totals.cacheRead + totals.input > 0
      ? totals.cacheRead / (totals.cacheRead + totals.input)
      : 0;
    return {
      stats: {
        sessionId: session.id,
        model: session.model,
        turnCount: turns.length,
        toolCallCount: calls.length,
        errorCount: calls.filter((c) => c.status === 'error').length,
        tokens: totals,
        cacheHitRate,
        costUsd: computeCostUsd(session.model, totals),
      },
    };
  });
};
