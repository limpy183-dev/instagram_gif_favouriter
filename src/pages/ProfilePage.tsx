import { SectionCard } from '../App';

interface ProfilePageProps {
  workspace: { profile: { displayName: string; avatarUrl: string; accent: string; landingPage: string; offlineCache: boolean; publicProfile: boolean; publicFavourites: boolean }; gifMeta: Record<string, { imported: boolean; collectionIds: string[]; tags: string[] }> };
  updateProfileField: (nextProfile: Record<string, unknown>) => void;
  user: { email?: string | null };
  gifMap: Record<string, { title?: string }>;
}

export function ProfilePage({ workspace, updateProfileField, user, gifMap }: ProfilePageProps) {
  return (
    <div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-6">
      <SectionCard title="Profile Personalization" subtitle="Profile preferences now persist in Supabase.">
        <div className="space-y-3">
          <div className="flex items-center gap-4"><div className="avatar-preview">{workspace.profile.avatarUrl ? <img src={workspace.profile.avatarUrl} alt="avatar preview" className="w-full h-full object-cover" /> : <span>{(workspace.profile.displayName || user.email || 'U').slice(0, 2).toUpperCase()}</span>}</div><div className="text-sm text-zinc-400">Use a direct image URL. `ibb.co` links are converted automatically when possible.</div></div>
          <input value={workspace.profile.displayName} onChange={(e) => updateProfileField({ ...workspace.profile, displayName: e.target.value })} placeholder="Display name" className="field" />
          <input value={workspace.profile.avatarUrl} onChange={(e) => updateProfileField({ ...workspace.profile, avatarUrl: e.target.value })} placeholder="Avatar image URL" className="field" />
          <div className="flex items-center gap-3"><input type="color" value={workspace.profile.accent} onChange={(e) => updateProfileField({ ...workspace.profile, accent: e.target.value })} className="h-12 w-16 rounded-xl bg-transparent border border-white/10" /><span className="text-sm text-zinc-400">Accent color</span></div>
          <select value={workspace.profile.landingPage} onChange={(e) => updateProfileField({ ...workspace.profile, landingPage: e.target.value })} className="field"><option value="discover">Discover</option><option value="favourites">Favourites</option><option value="toolbox">Toolbox</option><option value="users">Users</option><option value="profile">Profile</option></select>
          <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={workspace.profile.offlineCache} onChange={(e) => updateProfileField({ ...workspace.profile, offlineCache: e.target.checked })} /> Enable offline cached favourites</label>
          <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={workspace.profile.publicProfile} onChange={(e) => updateProfileField({ ...workspace.profile, publicProfile: e.target.checked })} /> Allow others to find my profile</label>
          <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={workspace.profile.publicFavourites} onChange={(e) => updateProfileField({ ...workspace.profile, publicFavourites: e.target.checked })} /> Allow others to see my favourites</label>
        </div>
      </SectionCard>
      <SectionCard title="Synced Metadata Review" subtitle="Notes, tags, imports, and queue state persist via Supabase gif metadata.">
        <div className="space-y-3 max-h-[36rem] overflow-auto pr-1">{Object.entries(workspace.gifMeta).map(([gifId, meta]) => <div key={gifId} className="review-row"><div><p className="text-sm font-semibold text-white">{gifMap[gifId]?.title ?? gifId}</p><p className="text-xs text-zinc-500">{meta.imported ? 'Imported' : 'Saved'} · collections: {meta.collectionIds.join(', ') || 'none'}</p></div><div className="flex gap-2 flex-wrap">{meta.tags.map((tag) => <span key={tag} className="chip">#{tag}</span>)}</div></div>)}</div>
      </SectionCard>
    </div>
  );
}
