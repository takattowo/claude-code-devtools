import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useLiveSession = (sessionId: string | null) => {
  const qc = useQueryClient();
  useEffect(() => {
    if (!sessionId) return;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${window.location.host}/ws?sessionId=${encodeURIComponent(sessionId)}`);
    ws.onmessage = () => {
      qc.invalidateQueries({ queryKey: ['tool-calls', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
    };
    return () => ws.close();
  }, [sessionId, qc]);
};
