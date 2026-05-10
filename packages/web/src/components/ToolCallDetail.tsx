import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';
import { useUiStore } from '../state.js';

export const ToolCallDetail = () => {
  const sessionId = useUiStore((s) => s.selectedSessionId);
  const tcId = useUiStore((s) => s.selectedToolCallId);
  const { data: calls } = useQuery({
    queryKey: ['tool-calls', sessionId],
    queryFn: () => sessionId ? api.listToolCalls(sessionId) : Promise.resolve([]),
    enabled: !!sessionId,
  });
  const call = (calls ?? []).find((c) => c.id === tcId);

  if (!call) {
    return <div className="text-zinc-500 text-sm">Click a tool call.</div>;
  }
  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="text-xs uppercase text-zinc-500">Tool</div>
        <div className="text-zinc-100">{call.name}</div>
      </div>
      <div>
        <div className="text-xs uppercase text-zinc-500">Status</div>
        <div className="text-zinc-100">{call.status}</div>
      </div>
      {call.filePath && (
        <div>
          <div className="text-xs uppercase text-zinc-500">File</div>
          <div className="text-zinc-100 break-all">{call.filePath}</div>
        </div>
      )}
      <div>
        <div className="text-xs uppercase text-zinc-500">Input</div>
        <pre className="bg-zinc-950 p-2 rounded text-xs overflow-auto max-h-40 whitespace-pre-wrap break-all">{JSON.stringify(call.input, null, 2)}</pre>
      </div>
      {call.output && (
        <div>
          <div className="text-xs uppercase text-zinc-500">Output</div>
          <pre className="bg-zinc-950 p-2 rounded text-xs overflow-auto max-h-60 whitespace-pre-wrap break-all">{call.output}</pre>
        </div>
      )}
      {call.errorMessage && (
        <div>
          <div className="text-xs uppercase text-rose-400">Error</div>
          <pre className="bg-zinc-950 p-2 rounded text-xs overflow-auto max-h-60 whitespace-pre-wrap break-all">{call.errorMessage}</pre>
        </div>
      )}
    </div>
  );
};
