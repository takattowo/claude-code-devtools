import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';
import type { HeatmapEntry } from '../types.js';

const HeatmapRow = ({ entry, max }: { entry: HeatmapEntry; max: number }) => {
  const widthPct = max > 0 ? (entry.count / max) * 100 : 0;
  return (
    <div className="px-3 py-1.5 border-b border-zinc-900 text-sm flex items-center gap-3">
      <div className="w-32 shrink-0 relative h-5 bg-zinc-900 rounded overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-emerald-500/60"
          style={{ width: widthPct + '%' }}
        />
        <div className="absolute inset-0 flex items-center justify-end pr-2 text-xs text-zinc-100">
          {entry.count}
        </div>
      </div>
      <div className="flex-1 min-w-0 truncate text-zinc-200" title={entry.filePath}>{entry.filePath}</div>
      <div className="flex gap-2 text-xs shrink-0">
        {entry.reads > 0 && <span className="text-zinc-400">R:{entry.reads}</span>}
        {entry.edits > 0 && <span className="text-amber-400">E:{entry.edits}</span>}
        {entry.writes > 0 && <span className="text-sky-400">W:{entry.writes}</span>}
        {entry.errors > 0 && <span className="text-rose-400">!:{entry.errors}</span>}
      </div>
    </div>
  );
};

export const HeatmapView = ({ sessionId }: { sessionId: string }) => {
  const { data: entries } = useQuery({
    queryKey: ['heatmap', sessionId],
    queryFn: () => api.getHeatmap(sessionId),
    refetchInterval: 2_000,
  });
  const items = entries ?? [];
  if (items.length === 0) {
    return <div className="p-4 text-zinc-500 text-sm">No file activity yet.</div>;
  }
  const max = items[0]?.count ?? 1;
  return (
    <div className="flex-1 overflow-auto">
      {items.map((e) => <HeatmapRow key={e.filePath} entry={e} max={max} />)}
    </div>
  );
};
