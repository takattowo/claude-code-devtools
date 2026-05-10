import type { FastifyInstance } from 'fastify';
import type { Store, Redactor, Turn, ToolCall } from '@cli-talker/core';

const redactTurn = (r: Redactor, t: Turn): Turn => ({ ...t, text: r.apply(t.text) ?? null });
const redactToolCall = (r: Redactor, c: ToolCall): ToolCall => ({
  ...c,
  input: r.applyDeep(c.input),
  output: r.apply(c.output) ?? null,
  errorMessage: r.apply(c.errorMessage) ?? null,
});

export const registerSessionsRoutes = (
  app: FastifyInstance,
  store: Store,
  redactor: Redactor,
): void => {
  app.get('/api/sessions', async () => ({ sessions: store.listSessions() }));

  app.get<{ Params: { id: string } }>('/api/sessions/:id', async (req, reply) => {
    const s = store.getSession(req.params.id);
    if (!s) { reply.code(404); return { error: 'not found' }; }
    return { session: s };
  });

  app.get<{ Params: { id: string } }>('/api/sessions/:id/turns', async (req) => {
    const turns = store.listTurns(req.params.id);
    return { turns: redactor.enabled ? turns.map((t) => redactTurn(redactor, t)) : turns };
  });

  app.get<{ Params: { id: string } }>('/api/sessions/:id/tool-calls', async (req) => {
    const toolCalls = store.listToolCalls(req.params.id);
    return {
      toolCalls: redactor.enabled ? toolCalls.map((c) => redactToolCall(redactor, c)) : toolCalls,
    };
  });
};
