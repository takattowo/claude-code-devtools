import { useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { api } from '../api.js';
import { ToolCallRow } from './ToolCallRow.js';
import { useLiveSession } from '../hooks/useLiveSession.js';
import { Scrubber } from './Scrubber.js';
import { useUiStore } from '../state.js';

export const TimelineView = ({ sessionId }: { sessionId: string }) => {
  useLiveSession(sessionId);
  const scrubberIdx = useUiStore((s) => s.scrubberTurnIndex);

  const { data: calls } = useQuery({
    queryKey: ['tool-calls', sessionId],
    queryFn: () => api.listToolCalls(sessionId),
    refetchInterval: 1_500,
  });
  const { data: turns } = useQuery({
    queryKey: ['turns', sessionId],
    queryFn: () => api.listTurns(sessionId),
    refetchInterval: 1_500,
  });

  const turnIdToIndex = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of turns ?? []) m.set(t.id, t.index);
    return m;
  }, [turns]);

  const allCalls = calls ?? [];
  const totalTurns = turns?.length ?? 0;
  const cutoff = scrubberIdx === null ? Number.POSITIVE_INFINITY : scrubberIdx;
  const items = useMemo(
    () => allCalls.filter((c) => (turnIdToIndex.get(c.turnId) ?? -1) <= cutoff),
    [allCalls, turnIdToIndex, cutoff],
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const rv = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 12,
  });

  return (
    <div className="h-full flex flex-col">
      <Scrubber totalTurns={totalTurns} />
      <div ref={parentRef} className="flex-1 overflow-auto">
        <div style={{ height: rv.getTotalSize(), position: 'relative' }}>
          {rv.getVirtualItems().map((v) => {
            const call = items[v.index];
            return (
              <div key={call.id} style={{ position: 'absolute', top: 0, transform: `translateY(${v.start}px)`, width: '100%' }}>
                <ToolCallRow call={call} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
