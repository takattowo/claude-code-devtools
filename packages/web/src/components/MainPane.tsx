import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';
import { useUiStore } from '../state.js';
import { TimelineView } from './TimelineView.js';
import { HeatmapView } from './HeatmapView.js';

const usd = (n: number) => '$' + n.toFixed(4);

export const MainPane = () => {
  const sessionId = useUiStore((s) => s.selectedSessionId);
  const mainTab = useUiStore((s) => s.mainTab);
  const setMainTab = useUiStore((s) => s.setMainTab);

  const { data: session } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionId ? api.getSession(sessionId) : Promise.reject(new Error('no session')),
    enabled: !!sessionId,
    refetchInterval: 3_000,
  });
  const { data: stats } = useQuery({
    queryKey: ['stats', sessionId],
    queryFn: () => sessionId ? api.getStats(sessionId) : Promise.reject(new Error('no session')),
    enabled: !!sessionId,
    refetchInterval: 2_000,
  });

  if (!sessionId) {
    return <div className="h-full flex items-center justify-center text-zinc-500">Select a session</div>;
  }

  const statusColor = session?.status === 'active' ? 'bg-emerald-500'
    : session?.status === 'error' ? 'bg-rose-500'
    : 'bg-zinc-600';

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-zinc-800 px-4 py-2.5 flex items-center gap-4 text-sm">
        <span className={['inline-block w-2 h-2 rounded-full shrink-0', statusColor].join(' ')} />
        <span className="text-zinc-100 font-mono truncate" title={sessionId}>{sessionId.slice(0, 8)}</span>
        <span className="text-zinc-500 truncate" title={session?.cwd ?? ''}>{session?.cwd ?? ''}</span>
        <span className="ml-auto flex items-center gap-4 shrink-0 text-xs">
          <span className="text-zinc-400">{session?.model ?? ''}</span>
          {stats && (
            <>
              <span className="text-zinc-500">{stats.turnCount} turns</span>
              <span className="text-zinc-500">{stats.toolCallCount} calls</span>
              <span className="text-zinc-100">{usd(stats.costUsd)}</span>
            </>
          )}
        </span>
      </div>
      <div className="flex border-b border-zinc-800 text-xs">
        {(['timeline', 'heatmap'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setMainTab(t)}
            className={[
              'px-4 py-2 uppercase tracking-wide',
              mainTab === t ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-900',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>
      {mainTab === 'timeline' ? <TimelineView sessionId={sessionId} /> : <HeatmapView sessionId={sessionId} />}
    </div>
  );
};
