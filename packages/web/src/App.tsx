import { Group, Panel, Separator } from 'react-resizable-panels';
import { SessionSidebar } from './components/SessionSidebar.js';
import { MainPane } from './components/MainPane.js';
import { ToolCallDetail } from './components/ToolCallDetail.js';
import { ContextInspector } from './components/ContextInspector.js';
import { useUiStore } from './state.js';

const Handle = () => (
  <Separator className="w-px bg-zinc-800 hover:bg-zinc-600 cursor-col-resize transition-colors" />
);

const RightPane = () => {
  const tab = useUiStore((s) => s.rightTab);
  const setTab = useUiStore((s) => s.setRightTab);
  return (
    <aside className="h-full bg-zinc-900/40 flex flex-col">
      <div className="flex border-b border-zinc-800 text-xs">
        {(['inspector', 'detail'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'flex-1 px-3 py-2 uppercase tracking-wide',
              tab === t ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-900',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 p-3 overflow-y-auto">
        {tab === 'inspector' ? <ContextInspector /> : <ToolCallDetail />}
      </div>
    </aside>
  );
};

export const App = () => (
  <Group orientation="horizontal" className="h-full">
    <Panel defaultSize="18%" minSize="10%" maxSize="40%">
      <SessionSidebar />
    </Panel>
    <Handle />
    <Panel defaultSize="56%" minSize="30%">
      <MainPane />
    </Panel>
    <Handle />
    <Panel defaultSize="26%" minSize="15%" maxSize="50%">
      <RightPane />
    </Panel>
  </Group>
);
