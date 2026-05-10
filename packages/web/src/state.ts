import { create } from 'zustand';
import type { SessionFilter } from './types.js';

type RightTab = 'inspector' | 'detail';
type MainTab = 'timeline' | 'heatmap';
type ViewMode = 'sessions' | 'dashboard';
export type DatePreset = 'today' | '7d' | '30d' | 'all';

interface UiState {
  view: ViewMode;
  selectedSessionId: string | null;
  selectedToolCallId: string | null;
  rightTab: RightTab;
  mainTab: MainTab;
  scrubberTurnIndex: number | null;
  filter: SessionFilter;
  datePreset: DatePreset;
  setView: (v: ViewMode) => void;
  setSelectedSession: (id: string | null) => void;
  setSelectedToolCall: (id: string | null) => void;
  setRightTab: (t: RightTab) => void;
  setMainTab: (t: MainTab) => void;
  setScrubber: (idx: number | null) => void;
  setFilter: (patch: Partial<SessionFilter>) => void;
  clearFilter: () => void;
  setDatePreset: (p: DatePreset) => void;
}

export const presetRange = (p: DatePreset): { since: number | null; until: number | null } => {
  if (p === 'all') return { since: null, until: null };
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (p === 'today') {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return { since: start.getTime(), until: null };
  }
  if (p === '7d') return { since: now - 7 * day, until: null };
  return { since: now - 30 * day, until: null };
};

export const useUiStore = create<UiState>((set) => ({
  view: 'sessions',
  selectedSessionId: null,
  selectedToolCallId: null,
  rightTab: 'inspector',
  mainTab: 'timeline',
  scrubberTurnIndex: null,
  filter: {},
  datePreset: 'all',
  setView: (v) => set({ view: v }),
  setSelectedSession: (id) => set({
    view: 'sessions',
    selectedSessionId: id,
    selectedToolCallId: null,
    mainTab: 'timeline',
    scrubberTurnIndex: null,
  }),
  setSelectedToolCall: (id) => set({ selectedToolCallId: id, rightTab: 'detail' }),
  setRightTab: (t) => set({ rightTab: t }),
  setMainTab: (t) => set({ mainTab: t }),
  setScrubber: (idx) => set({ scrubberTurnIndex: idx }),
  setFilter: (patch) => set((s) => ({ filter: { ...s.filter, ...patch } })),
  clearFilter: () => set({ filter: {}, datePreset: 'all' }),
  setDatePreset: (p) => set({ datePreset: p }),
}));
