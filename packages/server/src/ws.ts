import type { FastifyInstance } from 'fastify';
import websocketPlugin from '@fastify/websocket';
import type { Normalizer } from '@cli-talker/core';

export const registerWebSocket = async (app: FastifyInstance, normalizer: Normalizer): Promise<void> => {
  await app.register(websocketPlugin);

  app.get('/ws', { websocket: true }, (socket, req) => {
    const url = new URL(req.url ?? '/ws', 'http://localhost');
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) {
      socket.close(1008, 'sessionId required');
      return;
    }
    const unsubscribe = normalizer.subscribe(sessionId, (event) => {
      try { socket.send(JSON.stringify(event)); } catch { /* ignore */ }
    });
    socket.on('close', () => unsubscribe());
  });
};
