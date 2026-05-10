import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';
import { presetRange, useUiStore, type DatePreset } from '../state.js';

const usd = (n: number) => '$' + n.toFixed(4);
const num = (n: number) => n.toLocaleString();

const presets: Array<{ id: DatePreset; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'all', label: 'All time' },
];

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4">
    <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
    <div className="text-2xl text-zinc-100 mt-1">{value}</div>
    {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
  </div>
);

export const DashboardView = () => {
  const datePreset = useUiStore((s) => s.datePreset);
  const setDatePreset = useUiStore((s) => s.setDatePreset);
  const range = presetRange(datePreset);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard', range.since, range.until],
    queryFn: () => api.getDashboard(range.since, range.until),
    refetchInterval: 5_000,
  });

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg text-zinc-100 font-medium">Dashboard</h1>
        <div className="flex gap-1 text-xs">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => setDatePreset(p.id)}
              className={[
                'px-3 py-1.5 rounded border',
                datePreset === p.id
                  ? 'bg-zinc-700 border-zinc-600 text-zinc-100'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="text-zinc-500">Loading...</div>}

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Sessions" value={num(summary.counts.sessions)} />
            <Stat label="Turns" value={num(summary.counts.turns)} />
            <Stat label="Tool calls" value={num(summary.counts.toolCalls)} sub={`${summary.counts.errors} errors`} />
            <Stat label="Total cost" value={usd(summary.costUsd)} sub={`${(summary.cacheHitRate * 100).toFixed(1)}% cache hit`} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Input tokens" value={num(summary.tokens.input)} />
            <Stat label="Output tokens" value={num(summary.tokens.output)} />
            <Stat label="Cache read" value={num(summary.tokens.cacheRead)} />
            <Stat label="Cache create" value={num(summary.tokens.cacheCreate)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded">
              <div className="px-4 py-2 border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">Cost by model</div>
              <table className="w-full text-sm">
                <tbody>
                  {summary.costByModel.length === 0 && (
                    <tr><td className="px-4 py-3 text-zinc-600 italic">No data</td></tr>
                  )}
                  {summary.costByModel.map((m) => (
                    <tr key={m.model} className="border-b border-zinc-800/50 last:border-0">
                      <td className="px-4 py-2 text-zinc-300 font-mono text-xs">{m.model.replace(/^claude-/, '')}</td>
                      <td className="px-4 py-2 text-right text-zinc-100">{usd(m.costUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded">
              <div className="px-4 py-2 border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">Top tools</div>
              <table className="w-full text-sm">
                <tbody>
                  {summary.topTools.length === 0 && (
                    <tr><td className="px-4 py-3 text-zinc-600 italic">No data</td></tr>
                  )}
                  {summary.topTools.map((t) => (
                    <tr key={t.name} className="border-b border-zinc-800/50 last:border-0">
                      <td className="px-4 py-2 text-zinc-300">{t.name}</td>
                      <td className="px-4 py-2 text-right text-zinc-100">{num(t.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded">
              <div className="px-4 py-2 border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">Top files</div>
              <table className="w-full text-sm">
                <tbody>
                  {summary.topFiles.length === 0 && (
                    <tr><td className="px-4 py-3 text-zinc-600 italic">No data</td></tr>
                  )}
                  {summary.topFiles.map((f) => (
                    <tr key={f.filePath} className="border-b border-zinc-800/50 last:border-0">
                      <td className="px-4 py-2 text-zinc-300 truncate max-w-[200px]" title={f.filePath}>{f.filePath}</td>
                      <td className="px-4 py-2 text-right text-zinc-100">{num(f.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
