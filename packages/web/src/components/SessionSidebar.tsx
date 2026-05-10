import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';
import { presetRange, useUiStore } from '../state.js';
import { FilterBar } from './FilterBar.js';

export const SessionSidebar = () => {
  const filter = useUiStore((s) => s.filter);
  const datePreset = useUiStore((s) => s.datePreset);
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);

  const { data, isLoading } = useQuery({
    queryKey: ['sessions', filter, datePreset],
    queryFn: () => {
      const r = presetRange(datePreset);
      return api.listSessions({
        ...filter,
        since: r.since ?? filter.since,
        until: r.until ?? filter.until,
      });
    },
    refetchInterval: 3_000,
  });
  const selectedId = useUiStore((s) => s.selectedSessionId);
  const setSelected = useUiStore((s) => s.setSelectedSession);

  return (
    <aside className="h-full bg-zinc-900/40 overflow-y-auto flex flex-col">
      <div className="flex border-b border-zinc-800 text-xs">
        <button
          onClick={() => setView('sessions')}
          className={[
            'flex-1 px-3 py-2 uppercase tracking-wide',
            view === 'sessions' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-900',
          ].join(' ')}
        >
          Sessions
        </button>
        <button
          onClick={() => setView('dashboard')}
          className={[
            'flex-1 px-3 py-2 uppercase tracking-wide',
            view === 'dashboard' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-900',
          ].join(' ')}
        >
          Dashboard
        </button>
      </div>
      <FilterBar />
      <div className="px-3 py-2 text-xs uppercase tracking-wide text-zinc-500 flex items-center justify-between">
        <span>Sessions</span>
        <span className="text-zinc-600">{data?.length ?? 0}</span>
      </div>
      {isLoading && <div className="p-3 text-zinc-500 text-sm">Loading</div>}
      <ul className="flex-1">
        {(data ?? []).map((s) => (
          <li key={s.id}>
            <button
              onClick={() => setSelected(s.id)}
              className={[
                'w-full text-left px-3 py-2 text-sm',
                s.id === selectedId ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-800/50',
              ].join(' ')}
            >
              <div className="flex items-center gap-2">
                <span className={['inline-block w-2 h-2 rounded-full', s.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-600'].join(' ')} />
                <span className="truncate">{s.id.slice(0, 8)}</span>
                <span className="ml-auto text-xs text-zinc-500 truncate">{s.model.replace(/^claude-/, '')}</span>
              </div>
              <div className="text-xs text-zinc-500 truncate">{s.cwd}</div>
            </button>
          </li>
        ))}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <li className="px-3 py-4 text-zinc-600 text-xs italic">No sessions match filter</li>
        )}
      </ul>
    </aside>
  );
};
