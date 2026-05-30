import type { Collection, Gif, ToastProps } from "../types";
import { SkeletonCard, Toast } from "../components/CardComponents";
import { GifCard } from "../components/GifCard";
import { MasonryGrid } from "../components/MasonryGrid";
import { useProgressiveReveal } from "../hooks/useProgressiveReveal";

interface PublicCollectionPageProps {
  publicCollection: Collection | null;
  publicCollectionLoading: boolean;
  publicCollectionGifs: Gif[];
  toast: ToastProps;
}

export function PublicCollectionPage({
  publicCollection,
  publicCollectionLoading,
  publicCollectionGifs,
  toast,
}: PublicCollectionPageProps) {
  const { visibleCount, sentinelRef } = useProgressiveReveal(publicCollectionGifs.length);
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-white">{publicCollection?.name ?? "Public Collection"}</h1>
            <p className="text-zinc-500 text-sm mt-1">{publicCollection?.description ?? "Shared collection view"}</p>
          </div>
          <a href="#/" className="secondary-btn no-underline">
            Back to app
          </a>
        </div>
        {publicCollectionLoading && (
          <MasonryGrid
            items={Array.from({ length: 8 })}
            renderItem={(_, index) => (
              <SkeletonCard key={index} height={[160, 200, 140, 220, 180][index % 5]} />
            )}
          />
        )}
        {!publicCollectionLoading && publicCollection && (
          <>
            <MasonryGrid
              items={publicCollectionGifs.slice(0, visibleCount)}
              renderItem={(gif, index) => (
                <GifCard
                  key={gif.id}
                  gif={gif}
                  index={index}
                  onSelect={() => {}}
                  isFavourited={false}
                  onToggleFavourite={() => {}}
                  notePreview=""
                  isQueued={false}
                  onQueueToggle={() => {}}
                />
              )}
            />
            <div ref={sentinelRef} className="h-1" />
          </>
        )}
        {!publicCollectionLoading && !publicCollection && (
          <div className="empty-state">
            <div className="text-6xl mb-4">🔗</div>
            <h3 className="text-xl font-bold text-zinc-300 mb-2">Collection not found</h3>
            <p className="text-zinc-500 text-sm">This public collection does not exist or is no longer shared.</p>
          </div>
        )}
      </main>
      <Toast {...toast} />
    </div>
  );
}
