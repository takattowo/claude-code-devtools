import { useUiStore } from '../state.js';

export interface ScrubberProps {
  totalTurns: number;
}

export const Scrubber = ({ totalTurns }: ScrubberProps) => {
  const idx = useUiStore((s) => s.scrubberTurnIndex);
  const setIdx = useUiStore((s) => s.setScrubber);
  const live = idx === null;
  const max = Math.max(0, totalTurns - 1);
  const value = live ? max : Math.min(idx, max);

  return (
    <div className="border-b border-zinc-800 px-4 py-2 flex items-center gap-3 text-xs">
      <button
        onClick={() => setIdx(live ? max : null)}
        className={[
          'px-2 py-1 rounded text-xs uppercase tracking-wide',
          live ? 'bg-emerald-600/30 text-emerald-300' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700',
        ].join(' ')}
        title={live ? 'Following live' : 'Click to resume following live'}
      >
        {live ? '● live' : 'live off'}
      </button>
      <input
        type="range"
        min={0}
        max={Math.max(max, 1)}
        value={value}
        onChange={(e) => setIdx(Number(e.target.value))}
        disabled={totalTurns === 0}
        className="flex-1 accent-emerald-500"
      />
      <span className="text-zinc-400 font-mono w-20 text-right shrink-0">
        {totalTurns === 0 ? '0/0' : `${value + 1}/${totalTurns}`}
      </span>
    </div>
  );
};
