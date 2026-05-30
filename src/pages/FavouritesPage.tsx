import type { Gif, Workspace, FavouriteSortOption } from "../types";
import { GifCard } from "../components/GifCard";
import { SectionCard } from "../components/CardComponents";
import { CollectionsPanel } from "../components/favourites/CollectionsPanel";
import { QueuePanel } from "../components/favourites/QueuePanel";
import { MasonryGrid } from "../components/MasonryGrid";
import { useProgressiveReveal } from "../hooks/useProgressiveReveal";

interface FavouritesPageProps {
  favouriteSearch: string;
  setFavouriteSearch: (value: string) => void;
  filterCollectionId: string;
  setFilterCollectionId: (value: string) => void;
  filterTag: string;
  setFilterTag: (value: string) => void;
  filterRating: string;
  setFilterRating: (value: string) => void;
  filterUsername: string;
  setFilterUsername: (value: string) => void;
  sortOption: FavouriteSortOption;
  setSortOption: (value: FavouriteSortOption) => void;
  onReshuffle: () => void;
  workspace: Workspace;
  allTags: string[];
  allUsernames: string[];
  filteredFavourites: Gif[];
  queuedGifs: Gif[];
  handleClearAll: () => void;
  onOpenGif: (gif: Gif) => void;
  handleToggleFavourite: (gif: Gif) => void;
  isQueued: (id: string) => boolean;
  handleQueueToggle: (gif: Gif) => void;
  newCollectionName: string;
  setNewCollectionName: (value: string) => void;
  newCollectionDescription: string;
  setNewCollectionDescription: (value: string) => void;
  newCollectionPublic: boolean;
  setNewCollectionPublic: (value: boolean) => void;
  addCollection: (name: string, desc: string, isPublic: boolean) => void;
  updateCollectionVisibility: (collectionId: string, isPublic: boolean) => void;
  reorderQueue: (direction: "up" | "down", gifId: string) => void;
  handleCopy: (text: string, label?: string) => void;
}

export function FavouritesPage({
  favouriteSearch,
  setFavouriteSearch,
  filterCollectionId,
  setFilterCollectionId,
  filterTag,
  setFilterTag,
  filterRating,
  setFilterRating,
  filterUsername,
  setFilterUsername,
  sortOption,
  setSortOption,
  onReshuffle,
  workspace,
  allTags,
  allUsernames,
  filteredFavourites,
  queuedGifs,
  handleClearAll,
  onOpenGif,
  handleToggleFavourite,
  isQueued,
  handleQueueToggle,
  newCollectionName,
  setNewCollectionName,
  newCollectionDescription,
  setNewCollectionDescription,
  newCollectionPublic,
  setNewCollectionPublic,
  addCollection,
  updateCollectionVisibility,
  reorderQueue,
  handleCopy,
}: FavouritesPageProps) {
  const { visibleCount, sentinelRef } = useProgressiveReveal(filteredFavourites.length);
  return (
    <SectionCard
      title="Favourite Library"
      subtitle="Collections, tags, smart filters, and queue all sync through Supabase."
      action={
        <button onClick={handleClearAll} className="secondary-btn">
          Clear all
        </button>
      }
    >
      <div className="grid lg:grid-cols-[1fr_18rem] gap-6">
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-3">
            <input
              value={favouriteSearch}
              onChange={(e) => setFavouriteSearch(e.target.value)}
              placeholder="Search titles, notes, tags..."
              className="field xl:col-span-2"
            />
            <select
              value={filterCollectionId}
              onChange={(e) => setFilterCollectionId(e.target.value)}
              className="field"
            >
              <option value="all">All favourites</option>
              {workspace.collections
                .filter((collection) => collection.id !== "all-favourites")
                .map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
            </select>
            <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className="field">
              <option value="all">All tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <select value={filterRating} onChange={(e) => setFilterRating(e.target.value)} className="field">
              <option value="all">All ratings</option>
              {["g", "pg", "pg-13", "r"].map((rating) => (
                <option key={rating} value={rating}>
                  {rating.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-3">
            <select value={filterUsername} onChange={(e) => setFilterUsername(e.target.value)} className="field">
              <option value="all">All creators</option>
              {allUsernames.map((username) => (
                <option key={username} value={username}>
                  @{username}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as FavouriteSortOption)}
                className="field flex-1"
              >
                <option value="date-added-desc">📅 Date added (Newest)</option>
                <option value="date-added-asc">📅 Date added (Oldest)</option>
                <option value="most-used">🔥 Most Used (Clicked)</option>
                <option value="alphabetical">🔤 Alphabetical (A-Z)</option>
                <option value="smart-recommendations">✨ Recommended for you</option>
                <option value="shuffle">🔀 Shuffle list</option>
              </select>
              {sortOption === "shuffle" && (
                <button
                  type="button"
                  onClick={onReshuffle}
                  className="secondary-btn px-3.5 flex items-center justify-center hover:bg-zinc-800 transition-colors"
                  title="Reshuffle favourites"
                >
                  🔄
                </button>
              )}
            </div>
            <div className="panel-muted xl:col-span-3">
              Public collections are shareable via `#/collections/{"{id}"}` links and load without needing the signed-in
              workspace.
            </div>
          </div>
          {filteredFavourites.length > 0 ? (
            <>
              <MasonryGrid
                items={filteredFavourites.slice(0, visibleCount)}
                renderItem={(gif, index) => (
                  <GifCard
                    key={gif.id}
                    gif={gif}
                    index={index}
                    onSelect={onOpenGif}
                    isFavourited={true}
                    onToggleFavourite={handleToggleFavourite}
                    notePreview={workspace.gifMeta[gif.id]?.notes}
                    isQueued={isQueued(gif.id)}
                    onQueueToggle={handleQueueToggle}
                  />
                )}
              />
              <div ref={sentinelRef} className="h-1" />
            </>
          ) : (
            <div className="empty-state">
              <div className="text-5xl">💔</div>
              <p className="text-zinc-400 mt-3">No favourites match the current filters.</p>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <CollectionsPanel
            workspace={workspace}
            newCollectionName={newCollectionName}
            setNewCollectionName={setNewCollectionName}
            newCollectionDescription={newCollectionDescription}
            setNewCollectionDescription={setNewCollectionDescription}
            newCollectionPublic={newCollectionPublic}
            setNewCollectionPublic={setNewCollectionPublic}
            addCollection={addCollection}
            updateCollectionVisibility={updateCollectionVisibility}
            handleCopy={handleCopy}
          />
          <QueuePanel queuedGifs={queuedGifs} workspace={workspace} reorderQueue={reorderQueue} />
        </div>
      </div>
    </SectionCard>
  );
}
