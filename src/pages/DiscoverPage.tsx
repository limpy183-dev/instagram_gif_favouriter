import { Gif, GifCard, SectionCard } from '../App';

interface DiscoverPageProps {
  currentLabel: string;
  analytics: { totalSaved: number; queued: number; importedCount: number; topTag: string };
  loading: boolean;
  gifs: Gif[];
  hasMore: boolean;
  loadingMore: boolean;
  fetchGifs: (query: string, cat: string, newOffset?: number) => void;
  searchQuery: string;
  activeCategory: string;
  offset: number;
  addHistory: (gif: Gif) => void;
  isFavourited: (id: string) => boolean;
  handleToggleFavourite: (gif: Gif) => void;
  workspace: { gifMeta: Record<string, { notes: string; useLater: boolean }>; profile: { helperMode: boolean }; history: unknown[] };
  isQueued: (id: string) => boolean;
  handleQueueToggle: (gif: Gif) => void;
  recentHistory: Gif[];
  manualImportTitle: string;
  setManualImportTitle: (value: string) => void;
  manualImportUrl: string;
  setManualImportUrl: (value: string) => void;
  importExternalGif: () => void;
}

export function DiscoverPage({ currentLabel, analytics, loading, gifs, hasMore, loadingMore, fetchGifs, searchQuery, activeCategory, offset, addHistory, isFavourited, handleToggleFavourite, workspace, isQueued, handleQueueToggle, recentHistory, manualImportTitle, setManualImportTitle, manualImportUrl, setManualImportUrl, importExternalGif }: DiscoverPageProps) {
  return (
    <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
      <SectionCard title={currentLabel} subtitle="Search, trend surf, and save quickly for replies, stories, and reels." action={<span className="text-zinc-500 text-xs">{gifs.length} loaded</span>}>
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <div className="stat-card"><strong>{analytics.totalSaved}</strong><span>Synced favourites</span></div>
          <div className="stat-card"><strong>{analytics.queued}</strong><span>Use later queue</span></div>
          <div className="stat-card"><strong>{analytics.importedCount}</strong><span>Manual imports</span></div>
        </div>
        {loading && <div className="masonry-grid">{Array.from({ length: 12 }).map((_, index) => <div key={index} className="masonry-item rounded-2xl overflow-hidden shimmer" style={{ height: `${[160, 200, 140, 220, 180][index % 5]}px` }} />)}</div>}
        {!loading && gifs.length > 0 && <div className="masonry-grid">{gifs.map((gif, index) => <GifCard key={gif.id} gif={gif} index={index} onSelect={addHistory} isFavourited={isFavourited(gif.id)} onToggleFavourite={handleToggleFavourite} notePreview={workspace.gifMeta[gif.id]?.notes} isQueued={isQueued(gif.id)} onQueueToggle={handleQueueToggle} />)}</div>}
        {!loading && gifs.length === 0 && <div className="empty-state"><div className="text-6xl mb-4">🔍</div><h3 className="text-xl font-bold text-zinc-300 mb-2">No GIFs Found</h3><p className="text-zinc-500 text-sm max-w-xs">Try a different search term or browse trending GIFs.</p></div>}
        {hasMore && !loading && <div className="flex justify-center mt-8"><button onClick={() => fetchGifs(searchQuery, activeCategory, offset)} disabled={loadingMore} className="primary-btn">{loadingMore ? 'Loading more...' : 'Load more GIFs'}</button></div>}
      </SectionCard>
      <div className="space-y-6">
        <SectionCard title="Creator Toolbox" subtitle="Synced helper settings, public collections, and offline fallback.">
          <div className="space-y-3 text-sm text-zinc-300">
            <div className="panel-muted">Multi-device sync: profile, collections, metadata, and history are stored in Supabase.</div>
            <div className="panel-muted">Helper mode: {workspace.profile.helperMode ? 'enabled' : 'disabled'}</div>
            <div className="panel-muted">Top tag: {analytics.topTag}</div>
          </div>
        </SectionCard>
        <SectionCard title="Recently Viewed" subtitle="Synced viewing history from Supabase.">
          <div className="grid grid-cols-2 gap-3">{recentHistory.length === 0 ? <p className="text-zinc-500 text-sm">No recent views yet.</p> : recentHistory.map((gif) => <button key={gif.id} onClick={() => addHistory(gif)} className="recent-card"><img src={gif.images.fixed_height.url} alt={gif.title} className="w-full h-24 object-cover rounded-xl mb-2" /><span className="text-xs text-zinc-300 line-clamp-2">{gif.title}</span></button>)}</div>
        </SectionCard>
        <SectionCard title="External Import" subtitle="Imported GIFs are now persisted as metadata and shared collection items.">
          <div className="space-y-3"><input value={manualImportTitle} onChange={(e) => setManualImportTitle(e.target.value)} placeholder="Optional title" className="field" /><input value={manualImportUrl} onChange={(e) => setManualImportUrl(e.target.value)} placeholder="https://...gif" className="field" /><button onClick={importExternalGif} className="primary-btn w-full">Import external GIF</button></div>
        </SectionCard>
      </div>
    </div>
  );
}
