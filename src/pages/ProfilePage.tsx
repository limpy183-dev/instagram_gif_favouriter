import { SectionCard } from '../App';

interface ProfilePageProps {
  workspace: { profile: { displayName: string; avatarUrl: string; accent: string; landingPage: string; offlineCache: boolean; publicProfile: boolean; publicFavourites: boolean }; gifMeta: Record<string, { imported: boolean; collectionIds: string[]; tags: string[] }> };
  updateProfileField: (nextProfile: Record<string, unknown>) => void;
  user: { email?: string | null; id?: string };
  gifMap: Record<string, { title?: string }>;
  giphyUsage?: { count: number; lastStatus: number | null; lastError: string; hourKey: string };
}

export function ProfilePage({ workspace, updateProfileField, user, gifMap, giphyUsage }: ProfilePageProps) {
  const profile = workspace.profile ?? {
    displayName: '',
    avatarUrl: '',
    accent: '#a855f7',
    landingPage: 'discover',
    offlineCache: true,
    publicProfile: true,
    publicFavourites: true,
  };
  const metadataEntries = Object.entries(workspace.gifMeta ?? {});

  return (
    <div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-6">
      <SectionCard title="Profile Personalization" subtitle="Profile preferences now persist in Supabase.">
        <div className="space-y-3">
          <div className="flex items-center gap-4"><div className="avatar-preview">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="avatar preview" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <span>{(profile.displayName || user.email || 'U').slice(0, 2).toUpperCase()}</span>}</div><div className="text-sm text-zinc-400">Use a direct image URL. `ibb.co` links are converted automatically when possible.</div></div>
          <div className="panel-muted">
            <div className="text-sm text-white font-medium">Signed-in account</div>
            <div className="text-xs text-zinc-400 mt-1 break-all">{user.email || 'No email'}</div>
            <div className="text-xs text-zinc-500 mt-1 break-all">User ID: {user.id || 'Unavailable'}</div>
            <div className="text-xs text-zinc-500 mt-2">Your profile name, avatar, favourites, collections, metadata, and history are all saved against this signed-in account.</div>
          </div>
          <input value={profile.displayName} onChange={(e) => updateProfileField({ ...profile, displayName: e.target.value })} placeholder="Display name" className="field" />
          <input value={profile.avatarUrl} onChange={(e) => updateProfileField({ ...profile, avatarUrl: e.target.value })} placeholder="Avatar image URL" className="field" />
          <div className="flex items-center gap-3"><input type="color" value={profile.accent} onChange={(e) => updateProfileField({ ...profile, accent: e.target.value })} className="h-12 w-16 rounded-xl bg-transparent border border-white/10" /><span className="text-sm text-zinc-400">Accent color</span></div>
          <select value={profile.landingPage} onChange={(e) => updateProfileField({ ...profile, landingPage: e.target.value })} className="field"><option value="discover">Discover</option><option value="favourites">Favourites</option><option value="toolbox">Toolbox</option><option value="users">Users</option><option value="profile">Profile</option></select>
          <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={profile.offlineCache} onChange={(e) => updateProfileField({ ...profile, offlineCache: e.target.checked })} /> Enable offline cached favourites</label>
          <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={profile.publicProfile} onChange={(e) => updateProfileField({ ...profile, publicProfile: e.target.checked })} /> Allow others to find my profile</label>
          <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={profile.publicFavourites} onChange={(e) => updateProfileField({ ...profile, publicFavourites: e.target.checked })} /> Allow others to see my favourites</label>
        </div>
      </SectionCard>
      <div className="space-y-6">
        <SectionCard title="Giphy Usage" subtitle="Local estimate of requests made from this browser in the current hour.">
          <div className="space-y-3">
            <div className="panel-muted"><strong>{giphyUsage?.count ?? 0}</strong><span className="block text-xs text-zinc-500 mt-1">Requests this hour from this browser</span></div>
            <div className="panel-muted">Last response status: {giphyUsage?.lastStatus ?? 'None yet'}</div>
            <div className="panel-muted">Last error: {giphyUsage?.lastError || 'None'}</div>
            <div className="text-xs text-zinc-500">This is a local counter, not an official Giphy quota meter. If the last status is `429`, you likely hit a rate limit.</div>
          </div>
        </SectionCard>
        <SectionCard title="Synced Metadata Review" subtitle="Notes, tags, imports, and queue state persist via Supabase gif metadata.">
          <div className="space-y-3 max-h-[36rem] overflow-auto pr-1">{metadataEntries.map(([gifId, meta]) => <div key={gifId} className="review-row"><div><p className="text-sm font-semibold text-white">{gifMap[gifId]?.title ?? gifId}</p><p className="text-xs text-zinc-500">{meta.imported ? 'Imported' : 'Saved'} · collections: {meta.collectionIds.join(', ') || 'none'}</p></div><div className="flex gap-2 flex-wrap">{meta.tags.map((tag) => <span key={tag} className="chip">#{tag}</span>)}</div></div>)}</div>
        </SectionCard>
      </div>
    </div>
  );
}
