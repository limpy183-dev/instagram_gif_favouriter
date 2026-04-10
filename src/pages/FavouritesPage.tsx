import { Collection, Gif, GifCard, SectionCard } from '../App';

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
  workspace: { collections: Collection[]; gifMeta: Record<string, { notes?: string }> };
  allTags: string[];
  allUsernames: string[];
  filteredFavourites: Gif[];
  queuedGifs: Gif[];
  handleClearAll: () => void;
  addHistory: (gif: Gif) => void;
  handleToggleFavourite: (gif: Gif) => void;
  isQueued: (id: string) => boolean;
  handleQueueToggle: (gif: Gif) => void;
  addGifToCollection: (gif: Gif, collectionId: string) => void;
  newCollectionName: string;
  setNewCollectionName: (value: string) => void;
  newCollectionDescription: string;
  setNewCollectionDescription: (value: string) => void;
  newCollectionPublic: boolean;
  setNewCollectionPublic: (value: boolean) => void;
  addCollection: () => void;
  updateCollectionVisibility: (collectionId: string, isPublic: boolean) => void;
  reorderQueue: (direction: 'up' | 'down', gifId: string) => void;
  handleCopy: (text: string, label?: string) => void;
}

export function FavouritesPage({ favouriteSearch, setFavouriteSearch, filterCollectionId, setFilterCollectionId, filterTag, setFilterTag, filterRating, setFilterRating, filterUsername, setFilterUsername, workspace, allTags, allUsernames, filteredFavourites, queuedGifs, handleClearAll, addHistory, handleToggleFavourite, isQueued, handleQueueToggle, addGifToCollection, newCollectionName, setNewCollectionName, newCollectionDescription, setNewCollectionDescription, newCollectionPublic, setNewCollectionPublic, addCollection, updateCollectionVisibility, reorderQueue, handleCopy }: FavouritesPageProps) {
  return (
    <SectionCard title="Favourite Library" subtitle="Collections, tags, smart filters, and queue all sync through Supabase." action={<button onClick={handleClearAll} className="secondary-btn">Clear all</button>}>
      <div className="grid lg:grid-cols-[1fr_18rem] gap-6">
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-3">
            <input value={favouriteSearch} onChange={(e) => setFavouriteSearch(e.target.value)} placeholder="Search titles, notes, tags..." className="field xl:col-span-2" />
            <select value={filterCollectionId} onChange={(e) => setFilterCollectionId(e.target.value)} className="field"><option value="all">All favourites</option>{workspace.collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select>
            <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className="field"><option value="all">All tags</option>{allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select>
            <select value={filterRating} onChange={(e) => setFilterRating(e.target.value)} className="field"><option value="all">All ratings</option>{['g', 'pg', 'pg-13', 'r'].map((rating) => <option key={rating} value={rating}>{rating.toUpperCase()}</option>)}</select>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-3">
            <select value={filterUsername} onChange={(e) => setFilterUsername(e.target.value)} className="field"><option value="all">All creators</option>{allUsernames.map((username) => <option key={username} value={username}>@{username}</option>)}</select>
            <div className="panel-muted xl:col-span-4">Public collections are shareable via `#/collections/{'{id}'}` links and load without needing the signed-in workspace.</div>
          </div>
          {filteredFavourites.length > 0 ? <div className="masonry-grid">{filteredFavourites.map((gif, index) => <GifCard key={gif.id} gif={gif} index={index} onSelect={addHistory} isFavourited={true} onToggleFavourite={handleToggleFavourite} notePreview={workspace.gifMeta[gif.id]?.notes} isQueued={isQueued(gif.id)} onQueueToggle={handleQueueToggle} />)}</div> : <div className="empty-state"><div className="text-5xl">💔</div><p className="text-zinc-400 mt-3">No favourites match the current filters.</p></div>}
        </div>
        <div className="space-y-4">
          <SectionCard title="Collections" subtitle="These collections now persist in Supabase.">
            <div className="space-y-3"><input value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} placeholder="Collection name" className="field" /><input value={newCollectionDescription} onChange={(e) => setNewCollectionDescription(e.target.value)} placeholder="Description" className="field" /><label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={newCollectionPublic} onChange={(e) => setNewCollectionPublic(e.target.checked)} /> Make public/shareable</label><button onClick={addCollection} className="primary-btn w-full">Create collection</button><div className="space-y-2 max-h-80 overflow-auto pr-1">{workspace.collections.map((collection) => <div key={collection.id} className="collection-card"><div><p className="text-sm font-semibold text-white">{collection.name}</p><p className="text-xs text-zinc-500">{collection.description || 'No description'} · {collection.gifIds.length} GIFs</p><label className="mt-2 flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={collection.isPublic} disabled={['all-favourites', 'queue'].includes(collection.id)} onChange={(e) => updateCollectionVisibility(collection.id, e.target.checked)} /> Public</label></div><button onClick={() => handleCopy(`${window.location.origin}${window.location.pathname}#/collections/${collection.id}`, 'Collection link')} className="secondary-btn">Copy link</button></div>)}</div></div>
          </SectionCard>
          <SectionCard title="Use Later Queue" subtitle="Queue order is also persisted.">
            <div className="space-y-2 max-h-72 overflow-auto pr-1">{queuedGifs.length === 0 ? <p className="text-zinc-500 text-sm">Queue is empty.</p> : queuedGifs.map((gif) => <div key={gif.id} className="queue-item"><div className="flex items-center gap-3 min-w-0"><img src={gif.images.fixed_height.url} alt={gif.title} className="w-12 h-12 rounded-xl object-cover" /><div className="min-w-0"><p className="text-sm text-white truncate">{gif.title}</p><p className="text-xs text-zinc-500 truncate">{workspace.gifMeta[gif.id]?.notes || 'No note yet'}</p></div></div><div className="flex gap-2"><button onClick={() => reorderQueue('up', gif.id)} className="mini-action">↑</button><button onClick={() => reorderQueue('down', gif.id)} className="mini-action">↓</button></div></div>)}</div>
          </SectionCard>
        </div>
      </div>
    </SectionCard>
  );
}
