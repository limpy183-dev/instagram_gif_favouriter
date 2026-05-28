import { Collection, Gif, PublicUserProfile, SectionCard } from '../App';

interface UsersPageProps {
  userSearch?: string;
  setUserSearch?: (value: string) => void;
  userSearchLoading?: boolean;
  searchUsers?: (query: string) => void;
  userResults?: PublicUserProfile[];
  selectedUserProfile: PublicUserProfile | null;
  selectedUserCollections: Collection[];
  selectedUserFavourites: Gif[];
  selectedUserLoading: boolean;
  loadPublicUser?: (userId: string) => void;
  selectedUserPublicView?: boolean;
}

export function UsersPage({ userSearch = '', setUserSearch, userSearchLoading = false, searchUsers, userResults = [], selectedUserProfile, selectedUserCollections, selectedUserFavourites, selectedUserLoading, loadPublicUser, selectedUserPublicView = false }: UsersPageProps) {
  return (
    <div className="grid xl:grid-cols-[0.85fr_1.15fr] gap-6">
      {!selectedUserPublicView && <SectionCard title="Search Users" subtitle="Find public profiles and browse their shared libraries."><div className="space-y-3"><div className="flex gap-3"><input value={userSearch} onChange={(e) => setUserSearch?.(e.target.value)} placeholder="Search by display name or user id" className="field" /><button onClick={() => searchUsers?.(userSearch)} className="primary-btn">Search</button></div>{userSearchLoading && <p className="text-sm text-zinc-400">Searching users...</p>}<div className="space-y-2">{userResults.map((profile) => <button key={profile.userId} onClick={() => loadPublicUser?.(profile.userId)} className="user-result-card"><div className="user-result-main"><div className="user-avatar">{profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" /> : <span>{profile.displayName.slice(0, 2).toUpperCase()}</span>}</div><div className="min-w-0"><p className="text-sm font-semibold text-white truncate">{profile.displayName}</p><p className="text-xs text-zinc-500 truncate">{profile.userId}</p></div></div><span className="text-xs text-zinc-400">{profile.publicFavourites ? 'Public favs' : 'Profile only'}</span></button>)}{!userSearchLoading && userResults.length === 0 && <p className="text-sm text-zinc-500">No public users loaded yet.</p>}</div></div></SectionCard>}
      <SectionCard title={selectedUserProfile ? `${selectedUserProfile.displayName}'s Profile` : 'Public Profile'} subtitle="Public favourites and collections that this user chose to share.">
        {selectedUserLoading && <p className="text-sm text-zinc-400">Loading public profile...</p>}
        {!selectedUserLoading && !selectedUserProfile && <div className="empty-state compact-empty"><div className="text-5xl">👤</div><p className="text-zinc-400 mt-3">Select a public user to view their profile.</p></div>}
        {!selectedUserLoading && selectedUserProfile && <div className="space-y-6"><div className="public-user-hero" style={{ borderColor: `${selectedUserProfile.accent}55` }}><div className="user-avatar large">{selectedUserProfile.avatarUrl ? <img src={selectedUserProfile.avatarUrl} alt={selectedUserProfile.displayName} className="w-full h-full object-cover" /> : <span>{selectedUserProfile.displayName.slice(0, 2).toUpperCase()}</span>}</div><div><h3 className="text-xl font-semibold text-white">{selectedUserProfile.displayName}</h3><p className="text-sm text-zinc-500 break-all">{selectedUserProfile.userId}</p><a href={`#/users/${selectedUserProfile.userId}`} className="text-sm text-violet-300 hover:text-violet-200">Open sharable profile link</a></div></div><div><h4 className="text-sm font-semibold text-white mb-3">Public Collections</h4><div className="space-y-2">{selectedUserCollections.length === 0 ? <p className="text-sm text-zinc-500">No public collections.</p> : selectedUserCollections.map((collection) => <div key={collection.id} className="collection-card"><div><p className="text-sm font-semibold text-white">{collection.name}</p><p className="text-xs text-zinc-500">{collection.description || 'No description'} · {collection.gifIds.length} GIFs</p></div><a href={`#/collections/${collection.id}`} className="secondary-btn no-underline">Open</a></div>)}</div></div><div><h4 className="text-sm font-semibold text-white mb-3">Public Favourites</h4>{selectedUserProfile.publicFavourites ? selectedUserFavourites.length > 0 ? <div className="masonry-grid">{selectedUserFavourites.map((gif, index) => <div key={gif.id} className="masonry-item rounded-2xl overflow-hidden bg-zinc-900 border border-white/5"><img src={gif.images.fixed_height.url} alt={gif.title} className="w-full block" /><div className="p-3"><p className="text-sm text-white line-clamp-2">{gif.title || `GIF ${index + 1}`}</p><p className="text-xs text-zinc-500 mt-1">@{gif.username || 'unknown'}</p></div></div>)}</div> : <p className="text-sm text-zinc-500">No public favourites yet.</p> : <p className="text-sm text-zinc-500">This user keeps favourites private.</p>}</div></div>}
      </SectionCard>
    </div>
  );
}
