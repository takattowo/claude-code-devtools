import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';
import { useUiStore } from '../state.js';

export const SessionSidebar = () => {
  const { data, isLoading } = useQuery({ queryKey: ['sessions'], queryFn: api.listSessions, refetchInterval: 3_000 });
  const selectedId = useUiStore((s) => s.selectedSessionId);
  const setSelected = useUiStore((s) => s.setSelectedSession);

  return (
    <aside className="h-full bg-zinc-900/40 overflow-y-auto">
      <div className="p-3 text-xs uppercase tracking-wide text-zinc-500">Sessions</div>
      {isLoading && <div className="p-3 text-zinc-500 text-sm">Loading</div>}
      <ul>
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
              </div>
              <div className="text-xs text-zinc-500 truncate">{s.cwd}</div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
};
