import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';
import { useUiStore } from '../state.js';

const fmt = (n: number) => n.toLocaleString('en-US');
const pct = (n: number) => (n * 100).toFixed(1) + '%';
const usd = (n: number) => '$' + n.toFixed(4);

export const ContextInspector = () => {
  const sessionId = useUiStore((s) => s.selectedSessionId);
  const { data: stats } = useQuery({
    queryKey: ['stats', sessionId],
    queryFn: () => sessionId ? api.getStats(sessionId) : Promise.reject(new Error('no session')),
    enabled: !!sessionId,
    refetchInterval: 2_000,
  });

  if (!sessionId) {
    return <div className="text-zinc-500 text-sm">No session selected.</div>;
  }
  if (!stats) {
    return <div className="text-zinc-500 text-sm">Loading stats...</div>;
  }
  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="text-xs uppercase text-zinc-500">Model</div>
        <div className="text-zinc-100">{stats.model}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-xs uppercase text-zinc-500">Turns</div>
          <div className="text-zinc-100">{fmt(stats.turnCount)}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-zinc-500">Tool calls</div>
          <div className="text-zinc-100">{fmt(stats.toolCallCount)}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-zinc-500">Errors</div>
          <div className={stats.errorCount > 0 ? 'text-rose-400' : 'text-zinc-100'}>{fmt(stats.errorCount)}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-zinc-500">Cost</div>
          <div className="text-zinc-100">{usd(stats.costUsd)}</div>
        </div>
      </div>
      <div>
        <div className="text-xs uppercase text-zinc-500 mb-1">Tokens</div>
        <div className="bg-zinc-950 p-2 rounded space-y-1">
          <div className="flex justify-between"><span className="text-zinc-500">Input</span><span className="text-zinc-100">{fmt(stats.tokens.input)}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Output</span><span className="text-zinc-100">{fmt(stats.tokens.output)}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Cache read</span><span className="text-emerald-400">{fmt(stats.tokens.cacheRead)}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Cache create</span><span className="text-zinc-100">{fmt(stats.tokens.cacheCreate)}</span></div>
        </div>
      </div>
      <div>
        <div className="text-xs uppercase text-zinc-500">Cache hit rate</div>
        <div className="text-zinc-100">{pct(stats.cacheHitRate)}</div>
      </div>
    </div>
  );
};
