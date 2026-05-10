import type { FastifyInstance } from 'fastify';
import type { Store, Redactor, SessionFilter, Turn, ToolCall } from '@cli-talker/core';

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
  app.get<{
    Querystring: {
      cwd?: string; model?: string; status?: string;
      since?: string; until?: string; q?: string;
      tool?: string; filePath?: string; hasErrors?: string;
      limit?: string; offset?: string;
    };
  }>('/api/sessions', async (req) => {
    const qp = req.query ?? {};
    const hasFilters = !!(qp.cwd || qp.model || qp.status || qp.since || qp.until
      || qp.q || qp.tool || qp.filePath || qp.hasErrors || qp.limit || qp.offset);
    if (!hasFilters) return { sessions: store.listSessions() };
    const filter: SessionFilter = {
      cwd: qp.cwd, model: qp.model, status: qp.status,
      since: qp.since ? Number(qp.since) : undefined,
      until: qp.until ? Number(qp.until) : undefined,
      q: qp.q, tool: qp.tool, filePath: qp.filePath,
      hasErrors: qp.hasErrors === '1' || qp.hasErrors === 'true' ? true : undefined,
      limit: qp.limit ? Number(qp.limit) : undefined,
      offset: qp.offset ? Number(qp.offset) : undefined,
    };
    return { sessions: store.findSessions(filter) };
  });

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
