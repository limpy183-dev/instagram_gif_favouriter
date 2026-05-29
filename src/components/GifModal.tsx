import { useEffect, useRef, useState } from "react";
import type { Gif, Collection } from "../types";
import { CloseIcon, HeartIcon, XIcon, InstagramIcon, CopyIcon, DownloadIcon } from "./Icons";

interface GifModalProps {
  gif: Gif | null;
  onClose: () => void;
  onCopy: (text: string, label?: string) => void;
  isFavourited: boolean;
  onToggleFavourite: (gif: Gif) => void;
  note: string;
  tags: string[];
  searchTerms: string[];
  onUpdateNote: (gif: Gif, note: string) => void;
  onAddTag: (gif: Gif, tag: string) => void;
  onRemoveSearchTerm: (gif: Gif, term: string) => void;
  collections: Collection[];
  onAddGifToCollection: (gif: Gif, collectionId: string) => void;
  onRemoveGifFromCollection: (gif: Gif, collectionId: string) => void;
}

export function GifModal({
  gif,
  onClose,
  onCopy,
  isFavourited,
  onToggleFavourite,
  note,
  tags,
  searchTerms,
  onUpdateNote,
  onAddTag,
  onRemoveSearchTerm,
  collections,
  onAddGifToCollection,
  onRemoveGifFromCollection,
}: GifModalProps) {
  const [draftTag, setDraftTag] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!gif) return;
      if (e.key === "Escape") onClose();
      if (e.key.toLowerCase() === "f") onToggleFavourite(gif);
      if (e.key.toLowerCase() === "c") {
        onCopy(gif.title?.replace(/\s+GIF$/, "").trim() || "Untitled", "Name");
      }
      if (e.key.toLowerCase() === "u") {
        onCopy(gif.images.fixed_height.url, "URL");
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [gif, onClose, onCopy, onToggleFavourite]);

  if (!gif) return null;
  const searchName = gif.title?.replace(/\s+GIF$/, "").trim() || "Untitled";

  return (
    <div
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop bg-black/75"
    >
      <div className="relative bg-[var(--bg-elevated)] rounded-3xl overflow-hidden shadow-2xl shadow-black/60 max-w-3xl w-full border border-[var(--border-strong)] scale-in max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors backdrop-blur-md"
          aria-label="Close"
        >
          <CloseIcon />
        </button>
        <button
          onClick={() => onToggleFavourite(gif)}
          className={`heart-btn absolute top-4 left-4 z-10 rounded-full p-2.5 backdrop-blur-md ${
            isFavourited ? "text-white" : "bg-black/50 text-white/70 hover:text-white"
          }`}
          style={isFavourited ? { background: "var(--accent)" } : undefined}
          aria-label="Toggle favourite"
        >
          <HeartIcon filled={isFavourited} />
        </button>
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-[var(--bg)] flex items-center justify-center">
            <img src={gif.images.original.url} alt={gif.title} className="w-full max-h-[36rem] object-contain" />
          </div>
          <div className="p-5">
            <h3 className="text-white font-semibold text-base mb-3 tracking-tight text-balance">
              {gif.title || "Untitled GIF"}
            </h3>
            <div
              className="rounded-xl px-4 py-3 mb-4 border border-[rgba(245,57,107,0.25)]"
              style={{ background: "var(--accent-soft)" }}
            >
              <p className="text-[#ffc2d2] text-xs font-semibold mb-1">Instagram Reel Comment Search</p>
              <p className="text-[var(--text-muted)] text-xs leading-relaxed">
                Search{" "}
                <span className="text-white font-medium bg-white/10 px-1.5 py-0.5 rounded">{`"${searchName}"`}</span>{" "}
                when commenting on Reels.
              </p>
            </div>
            {searchTerms.length > 0 && (
              <div className="rounded-xl px-4 py-3 mb-4 border border-white/10 bg-white/5">
                <p className="text-white text-xs font-semibold mb-2">Found via search</p>
                <div className="flex flex-wrap gap-2">
                  {searchTerms.map((term) => (
                    <span key={term} className="chip flex items-center gap-1.5">
                      <span>{term}</span>
                      <button
                        onClick={() => onRemoveSearchTerm(gif, term)}
                        className="text-white/60 hover:text-white"
                        aria-label={`Remove search term ${term}`}
                      >
                        <XIcon />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button onClick={() => onCopy(searchName, "Name")} className="tool-btn">
                <InstagramIcon />
                Copy Name
              </button>
              <button onClick={() => onCopy(gif.images.fixed_height.url, "URL")} className="tool-btn">
                <CopyIcon />
                Copy URL
              </button>
              <a href={gif.images.original.url} target="_blank" rel="noopener noreferrer" className="tool-btn no-underline">
                <DownloadIcon />
                Open GIF
              </a>
            </div>
            <div className="mb-4">
              <label className="block text-[var(--text-muted)] text-xs font-semibold mb-1.5">Collections</label>
              <div className="flex flex-wrap gap-2">
                {collections
                  .filter((c) => c.id !== "all-favourites" && c.id !== "queue")
                  .map((collection) => {
                    const inCollection = collection.gifIds.includes(gif.id);
                    return (
                      <button
                        key={collection.id}
                        onClick={() =>
                          inCollection
                            ? onRemoveGifFromCollection(gif, collection.id)
                            : onAddGifToCollection(gif, collection.id)
                        }
                        className={`chip flex items-center gap-1.5 text-xs font-medium transition-colors ${
                          inCollection
                            ? "text-white border-[var(--accent)] bg-[var(--accent-soft)]"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        <span>
                          {inCollection ? "✓" : "+"} {collection.name}
                        </span>
                      </button>
                    );
                  })}
                {collections.filter((c) => c.id !== "all-favourites" && c.id !== "queue").length === 0 && (
                  <span className="text-xs text-zinc-500 italic">No custom collections created yet.</span>
                )}
              </div>
            </div>
            <label className="block text-[var(--text-muted)] text-xs font-semibold mb-1.5">Notes</label>
            <textarea
              value={note}
              onChange={(e) => onUpdateNote(gif, e.target.value)}
              className="field min-h-24 resize-none"
            />
            <div className="mt-4">
              <label className="block text-[var(--text-muted)] text-xs font-semibold mb-1.5">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <span key={tag} className="chip">
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={draftTag}
                  onChange={(e) => setDraftTag(e.target.value)}
                  placeholder="Add tag"
                  className="field flex-1"
                />
                <button
                  onClick={() => {
                    if (!draftTag.trim()) return;
                    onAddTag(gif, draftTag);
                    setDraftTag("");
                  }}
                  className="primary-btn"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
