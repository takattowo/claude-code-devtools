import type { FastifyInstance } from 'fastify';
import type { Store } from '@cli-talker/core';

export const registerDashboardRoutes = (app: FastifyInstance, store: Store): void => {
  app.get<{ Querystring: { since?: string; until?: string } }>(
    '/api/dashboard',
    async (req) => {
      const since = req.query?.since ? Number(req.query.since) : null;
      const until = req.query?.until ? Number(req.query.until) : null;
      return { summary: store.aggregateDashboard(since, until) };
    },
  );
};
