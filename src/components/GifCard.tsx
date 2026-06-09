import { memo, useState } from "react";
import type { Gif } from "../types";
import { HeartIcon } from "./Icons";
import { getAnimatedPreviewUrl } from "../utils/gifImage";

interface GifCardProps {
  gif: Gif;
  index: number;
  onSelect: (gif: Gif) => void;
  isFavourited: boolean;
  onToggleFavourite: (gif: Gif) => void;
  notePreview?: string;
  isQueued: boolean;
  onQueueToggle: (gif: Gif) => void;
}

function GifCardComponent({
  gif,
  index,
  onSelect,
  isFavourited,
  onToggleFavourite,
  notePreview,
  isQueued,
  onQueueToggle,
}: GifCardProps) {
  const [loaded, setLoaded] = useState(false);
  const searchName = gif.title?.replace(/\s+GIF$/, "").trim() || "Untitled";
  const previewUrl = getAnimatedPreviewUrl(gif);
  return (
    <div
      className="masonry-item gif-card relative rounded-2xl overflow-hidden cursor-pointer group"
      style={{ animationDelay: `${(Math.floor(index / 2) % 6) * 40}ms` }}
    >
      {!loaded && <div className="shimmer w-full rounded-2xl" style={{ height: "180px" }} />}
      <img
        src={previewUrl}
        alt={gif.title}
        decoding="async"
        className={`w-full rounded-2xl transition-transform duration-300 group-hover:scale-105 block ${
          loaded ? "opacity-100" : "opacity-0 absolute inset-0"
        }`}
        onLoad={() => setLoaded(true)}
        onClick={() => onSelect(gif)}
      />
      <div
        className="gif-overlay absolute inset-0 rounded-2xl flex flex-col justify-end pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)",
        }}
      >
        <div className="p-2.5">
          <p className="text-white text-xs font-semibold line-clamp-2">{searchName}</p>
          {notePreview && <p className="text-white/60 text-[10px] mt-1 line-clamp-2">{notePreview}</p>}
        </div>
      </div>
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQueueToggle(gif);
          }}
          className={`mini-action ${isQueued ? "text-white" : "bg-black/50 text-white/70"}`}
          style={isQueued ? { background: "var(--accent)" } : undefined}
          aria-label={isQueued ? "Remove from queue" : "Add to queue"}
        >
          {isQueued ? "Q" : "+"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavourite(gif);
          }}
          className={`mini-action ${
            isFavourited ? "text-white" : "bg-black/50 text-white/70 hover:text-white"
          }`}
          style={isFavourited ? { background: "var(--accent)" } : undefined}
          aria-label={isFavourited ? "Remove favourite" : "Add favourite"}
        >
          <HeartIcon filled={isFavourited} />
        </button>
      </div>
    </div>
  );
}

// Memoized so a parent re-render (e.g. unrelated workspace state change) doesn't
// re-render every card in the grid.
export const GifCard = memo(GifCardComponent);
