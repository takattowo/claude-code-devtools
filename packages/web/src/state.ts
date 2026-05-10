import { create } from 'zustand';

type RightTab = 'inspector' | 'detail';
type MainTab = 'timeline' | 'heatmap';

interface UiState {
  selectedSessionId: string | null;
  selectedToolCallId: string | null;
  rightTab: RightTab;
  mainTab: MainTab;
  scrubberTurnIndex: number | null;  // null = follow live (latest)
  setSelectedSession: (id: string | null) => void;
  setSelectedToolCall: (id: string | null) => void;
  setRightTab: (t: RightTab) => void;
  setMainTab: (t: MainTab) => void;
  setScrubber: (idx: number | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedSessionId: null,
  selectedToolCallId: null,
  rightTab: 'inspector',
  mainTab: 'timeline',
  scrubberTurnIndex: null,
  setSelectedSession: (id) => set({
    selectedSessionId: id,
    selectedToolCallId: null,
    mainTab: 'timeline',
    scrubberTurnIndex: null,
  }),
  setSelectedToolCall: (id) => set({ selectedToolCallId: id, rightTab: 'detail' }),
  setRightTab: (t) => set({ rightTab: t }),
  setMainTab: (t) => set({ mainTab: t }),
  setScrubber: (idx) => set({ scrubberTurnIndex: idx }),
}));
