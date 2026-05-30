import { useState, useMemo } from "react";
import type { Collection, Gif, PublicUserProfile, GifMeta, FavouriteSortOption } from "../../types";
import { SectionCard } from "../CardComponents";
import { GifCard } from "../GifCard";
import { MasonryGrid } from "../MasonryGrid";
import { useProgressiveReveal } from "../../hooks/useProgressiveReveal";

interface PublicProfileViewProps {
  selectedUserProfile: PublicUserProfile | null;
  selectedUserCollections: Collection[];
  selectedUserFavourites: Gif[];
  selectedUserMetadata?: Record<string, GifMeta>;
  selectedUserLoading: boolean;
  selectedUserPublicView?: boolean;
  isFavourited?: (id: string) => boolean;
  onToggleFavourite?: (gif: Gif) => void;
  isQueued?: (id: string) => boolean;
  onQueueToggle?: (gif: Gif) => void;
  onSelectGif?: (gif: Gif) => void;
}

export function PublicProfileView({
  selectedUserProfile,
  selectedUserCollections,
  selectedUserFavourites,
  selectedUserMetadata = {},
  selectedUserLoading,
  selectedUserPublicView = false,
  isFavourited,
  onToggleFavourite,
  isQueued,
  onQueueToggle,
  onSelectGif,
}: PublicProfileViewProps) {
  // Local state for filters and sorting inside the selected public profile
  const [favouriteSearch, setFavouriteSearch] = useState("");
  const [filterCollectionId, setFilterCollectionId] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [filterRating, setFilterRating] = useState("all");
  const [filterUsername, setFilterUsername] = useState("all");
  const [sortOption, setSortOption] = useState<FavouriteSortOption>("date-added-desc");
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // Derive tags from loaded public metadata
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    Object.values(selectedUserMetadata).forEach((meta) => {
      if (meta.tags) {
        meta.tags.forEach((tag) => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet).sort();
  }, [selectedUserMetadata]);

  // Derive creators from public favourites
  const allUsernames = useMemo(() => {
    return Array.from(new Set(selectedUserFavourites.map((gif) => gif.username).filter(Boolean))).sort();
  }, [selectedUserFavourites]);

  // Filter and sort public favourites
  const filteredFavourites = useMemo(() => {
    const selectedCollectionId = filterCollectionId === "all" ? null : filterCollectionId;
    const ids = selectedCollectionId
      ? selectedUserCollections.find((c) => c.id === selectedCollectionId)?.gifIds ?? []
      : null;

    let filtered = [...selectedUserFavourites];

    // Filtering
    filtered = filtered.filter((gif) => {
      const meta = selectedUserMetadata[gif.id];
      const haystack = `${gif.title} ${gif.username} ${meta?.notes ?? ""} ${(meta?.tags ?? []).join(" ")}`.toLowerCase();

      if (favouriteSearch && !haystack.includes(favouriteSearch.toLowerCase())) return false;
      if (filterTag !== "all" && !(meta?.tags ?? []).includes(filterTag)) return false;
      if (filterRating !== "all" && gif.rating !== filterRating) return false;
      if (filterUsername !== "all" && gif.username !== filterUsername) return false;
      if (ids && !ids.includes(gif.id)) return false;
      return true;
    });

    // Sorting
    if (sortOption === "date-added-asc") {
      filtered.sort((a, b) => {
        const timeA = new Date(selectedUserMetadata[a.id]?.addedAt || 0).getTime();
        const timeB = new Date(selectedUserMetadata[b.id]?.addedAt || 0).getTime();
        return timeA - timeB;
      });
    } else if (sortOption === "date-added-desc") {
      filtered.sort((a, b) => {
        const timeA = new Date(selectedUserMetadata[a.id]?.addedAt || 0).getTime();
        const timeB = new Date(selectedUserMetadata[b.id]?.addedAt || 0).getTime();
        return timeB - timeA;
      });
    } else if (sortOption === "alphabetical") {
      filtered.sort((a, b) => {
        const titleA = (a.title || "").toLowerCase();
        const titleB = (b.title || "").toLowerCase();
        return titleA.localeCompare(titleB);
      });
    } else if (sortOption === "shuffle") {
      const seed = shuffleSeed;
      const getRand = (str: string) => {
        let hash = 0;
        const combined = str + seed.toString();
        for (let i = 0; i < combined.length; i++) {
          hash = combined.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash % 1000) / 1000;
      };
      filtered.sort((a, b) => getRand(a.id) - getRand(b.id));
    }

    return filtered;
  }, [
    selectedUserFavourites,
    selectedUserMetadata,
    selectedUserCollections,
    favouriteSearch,
    filterCollectionId,
    filterTag,
    filterRating,
    filterUsername,
    sortOption,
    shuffleSeed,
  ]);

  const { visibleCount, sentinelRef } = useProgressiveReveal(filteredFavourites.length);

  return (
    <SectionCard
      title={selectedUserProfile ? `${selectedUserProfile.displayName}'s Profile` : "Public Profile"}
      subtitle="Public favourites and collections that this user chose to share."
    >
      {selectedUserLoading && <p className="text-sm text-zinc-400">Loading public profile...</p>}
      {!selectedUserLoading && !selectedUserProfile && (
        <div className="empty-state compact-empty">
          <div className="text-5xl">👤</div>
          <p className="text-zinc-400 mt-3">Select a public user to view their profile.</p>
        </div>
      )}
      {!selectedUserLoading && selectedUserProfile && (
        <div className="space-y-6">
          <div className="public-user-hero" style={{ borderColor: `${selectedUserProfile.accent}55` }}>
            <div className="user-avatar large">
              {selectedUserProfile.avatarUrl ? (
                <img src={selectedUserProfile.avatarUrl} alt={selectedUserProfile.displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{selectedUserProfile.displayName.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">{selectedUserProfile.displayName}</h3>
              <p className="text-sm text-zinc-500 break-all">{selectedUserProfile.userId}</p>
              <a href={`#/users/${selectedUserProfile.userId}`} className="text-sm text-violet-300 hover:text-violet-200">
                Open sharable profile link
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Public Collections</h4>
            <div className="space-y-2">
              {selectedUserCollections.length === 0 ? (
                <p className="text-sm text-zinc-500">No public collections.</p>
              ) : (
                selectedUserCollections.map((collection) => (
                  <div key={collection.id} className="collection-card">
                    <div>
                      <p className="text-sm font-semibold text-white">{collection.name}</p>
                      <p className="text-xs text-zinc-500">
                        {collection.description || "No description"} · {collection.gifIds.length} GIFs
                      </p>
                    </div>
                    <a href={`#/collections/${collection.id}`} className="secondary-btn no-underline">
                      Open
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Public Favourites</h4>
            {selectedUserProfile.publicFavourites ? (
              selectedUserFavourites.length > 0 ? (
                <div className="space-y-4">
                  {/* Filters and sorting */}
                  <div className="space-y-3 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <input
                        value={favouriteSearch}
                        onChange={(e) => setFavouriteSearch(e.target.value)}
                        placeholder="Search titles..."
                        className="field"
                      />
                      <select
                        value={filterCollectionId}
                        onChange={(e) => setFilterCollectionId(e.target.value)}
                        className="field"
                      >
                        <option value="all">All collections</option>
                        {selectedUserCollections.map((collection) => (
                          <option key={collection.id} value={collection.id}>
                            {collection.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={filterRating}
                        onChange={(e) => setFilterRating(e.target.value)}
                        className="field"
                      >
                        <option value="all">All ratings</option>
                        {["g", "pg", "pg-13", "r"].map((rating) => (
                          <option key={rating} value={rating}>
                            {rating.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      <select
                        value={filterUsername}
                        onChange={(e) => setFilterUsername(e.target.value)}
                        className="field"
                      >
                        <option value="all">All creators</option>
                        {allUsernames.map((username) => (
                          <option key={username} value={username}>
                            @{username}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-3 flex-wrap items-center">
                      {allTags.length > 0 && (
                        <select
                          value={filterTag}
                          onChange={(e) => setFilterTag(e.target.value)}
                          className="field max-w-[200px]"
                        >
                          <option value="all">All tags</option>
                          {allTags.map((tag) => (
                            <option key={tag} value={tag}>
                              {tag}
                            </option>
                          ))}
                        </select>
                      )}
                      <div className="flex gap-2 items-center flex-1 max-w-[280px]">
                        <select
                          value={sortOption}
                          onChange={(e) => setSortOption(e.target.value as FavouriteSortOption)}
                          className="field flex-1"
                        >
                          <option value="date-added-desc">📅 Date added (Newest)</option>
                          <option value="date-added-asc">📅 Date added (Oldest)</option>
                          <option value="alphabetical">🔤 Alphabetical (A-Z)</option>
                          <option value="shuffle">🔀 Shuffle list</option>
                        </select>
                        {sortOption === "shuffle" && (
                          <button
                            type="button"
                            onClick={() => setShuffleSeed((s) => s + 1)}
                            className="secondary-btn px-3.5 flex items-center justify-center hover:bg-zinc-800 transition-colors"
                            title="Reshuffle favourites"
                          >
                            🔄
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {filteredFavourites.length > 0 ? (
                    <>
                      <MasonryGrid
                        items={filteredFavourites.slice(0, visibleCount)}
                        isCompact={!selectedUserPublicView}
                        renderItem={(gif, index) => (
                          <GifCard
                            key={gif.id}
                            gif={gif}
                            index={index}
                            onSelect={onSelectGif ?? (() => {})}
                            isFavourited={isFavourited ? isFavourited(gif.id) : false}
                            onToggleFavourite={onToggleFavourite ?? (() => {})}
                            notePreview={selectedUserMetadata[gif.id]?.notes}
                            isQueued={isQueued ? isQueued(gif.id) : false}
                            onQueueToggle={onQueueToggle ?? (() => {})}
                          />
                        )}
                      />
                      <div ref={sentinelRef} className="h-1" />
                    </>
                  ) : (
                    <div className="empty-state compact-empty">
                      <div className="text-4xl">💔</div>
                      <p className="text-sm text-zinc-500 mt-2">No public favourites match the current filters.</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No public favourites yet.</p>
              )
            ) : (
              <p className="text-sm text-zinc-500">This user keeps favourites private.</p>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
