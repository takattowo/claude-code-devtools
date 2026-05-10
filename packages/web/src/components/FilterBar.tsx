import { useUiStore, type DatePreset } from '../state.js';

const presets: Array<{ id: DatePreset; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: 'all', label: 'All' },
];

export const FilterBar = () => {
  const filter = useUiStore((s) => s.filter);
  const setFilter = useUiStore((s) => s.setFilter);
  const clearFilter = useUiStore((s) => s.clearFilter);
  const datePreset = useUiStore((s) => s.datePreset);
  const setDatePreset = useUiStore((s) => s.setDatePreset);

  const hasAny = !!(filter.q || filter.cwd || filter.model || filter.status || filter.tool
    || filter.filePath || filter.hasErrors || datePreset !== 'all');

  return (
    <div className="border-b border-zinc-800 p-2 space-y-2 text-xs">
      <input
        type="text"
        value={filter.q ?? ''}
        onChange={(e) => setFilter({ q: e.target.value || undefined })}
        placeholder="Search text, cwd, tools..."
        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
      />
      <div className="flex gap-1">
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => setDatePreset(p.id)}
            className={[
              'flex-1 px-2 py-1 rounded border',
              datePreset === p.id
                ? 'bg-zinc-700 border-zinc-600 text-zinc-100'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800',
            ].join(' ')}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        <input
          type="text"
          value={filter.cwd ?? ''}
          onChange={(e) => setFilter({ cwd: e.target.value || undefined })}
          placeholder="cwd"
          className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
        />
        <input
          type="text"
          value={filter.model ?? ''}
          onChange={(e) => setFilter({ model: e.target.value || undefined })}
          placeholder="model"
          className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
        />
        <input
          type="text"
          value={filter.tool ?? ''}
          onChange={(e) => setFilter({ tool: e.target.value || undefined })}
          placeholder="tool name"
          className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
        />
        <input
          type="text"
          value={filter.filePath ?? ''}
          onChange={(e) => setFilter({ filePath: e.target.value || undefined })}
          placeholder="file path"
          className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
        />
      </div>
      <div className="flex items-center gap-2">
        <select
          value={filter.status ?? ''}
          onChange={(e) => setFilter({ status: e.target.value || undefined })}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-100 focus:outline-none focus:border-zinc-600"
        >
          <option value="">any status</option>
          <option value="active">active</option>
          <option value="ended">ended</option>
          <option value="error">error</option>
        </select>
        <label className="flex items-center gap-1 text-zinc-400">
          <input
            type="checkbox"
            checked={filter.hasErrors ?? false}
            onChange={(e) => setFilter({ hasErrors: e.target.checked || undefined })}
            className="accent-zinc-500"
          />
          errors
        </label>
        {hasAny && (
          <button
            onClick={clearFilter}
            className="text-zinc-400 hover:text-zinc-100 px-2"
          >
            clear
          </button>
        )}
      </div>
    </div>
  );
};
