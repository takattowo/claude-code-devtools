import type { ToolCall } from '../types.js';
import { useUiStore } from '../state.js';

const statusColor = (s: ToolCall['status']) =>
  s === 'success' ? 'text-emerald-400' :
  s === 'error' ? 'text-rose-400' :
  s === 'denied' ? 'text-amber-400' : 'text-zinc-400';

export const ToolCallRow = ({ call }: { call: ToolCall }) => {
  const selected = useUiStore((s) => s.selectedToolCallId);
  const setSelected = useUiStore((s) => s.setSelectedToolCall);
  const isSel = selected === call.id;

  return (
    <button
      onClick={() => setSelected(call.id)}
      className={[
        'w-full text-left px-3 py-1.5 text-sm border-b border-zinc-900 flex items-center gap-3',
        isSel ? 'bg-zinc-800' : 'hover:bg-zinc-900/40',
      ].join(' ')}
    >
      <span className={[statusColor(call.status), 'w-14 shrink-0 text-xs uppercase'].join(' ')}>{call.status}</span>
      <span className="text-zinc-200 w-44 shrink-0 truncate" title={call.name}>{call.name}</span>
      <span className="text-zinc-500 flex-1 min-w-0 truncate" title={call.filePath ?? ''}>{call.filePath ?? ''}</span>
      <span className="text-zinc-500 text-xs w-16 shrink-0 text-right">{call.durationMs ?? ''}ms</span>
    </button>
  );
};
