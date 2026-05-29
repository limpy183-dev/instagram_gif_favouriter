import type { Gif, Workspace } from "../../types";
import { SectionCard } from "../CardComponents";

interface QueuePanelProps {
  queuedGifs: Gif[];
  workspace: Workspace;
  reorderQueue: (direction: "up" | "down", gifId: string) => void;
}

export function QueuePanel({ queuedGifs, workspace, reorderQueue }: QueuePanelProps) {
  return (
    <SectionCard title="Use Later Queue" subtitle="Queue order is also persisted.">
      <div className="space-y-2 max-h-72 overflow-auto pr-1">
        {queuedGifs.length === 0 ? (
          <p className="text-zinc-500 text-sm">Queue is empty.</p>
        ) : (
          queuedGifs.map((gif) => (
            <div key={gif.id} className="queue-item">
              <div className="flex items-center gap-3 min-w-0">
                <img src={gif.images.fixed_height.url} alt={gif.title} className="w-12 h-12 rounded-xl object-cover" />
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{gif.title}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {workspace.gifMeta[gif.id]?.notes || "No note yet"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => reorderQueue("up", gif.id)} className="mini-action">
                  ↑
                </button>
                <button onClick={() => reorderQueue("down", gif.id)} className="mini-action">
                  ↓
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}
