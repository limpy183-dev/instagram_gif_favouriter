import type { PublicUserProfile } from "../../types";
import { SectionCard } from "../CardComponents";

interface UserSearchSectionProps {
  userSearch: string;
  setUserSearch?: (value: string) => void;
  userSearchLoading: boolean;
  searchUsers?: (query: string) => void;
  userResults: PublicUserProfile[];
  loadPublicUser?: (userId: string) => void;
}

export function UserSearchSection({
  userSearch,
  setUserSearch,
  userSearchLoading,
  searchUsers,
  userResults,
  loadPublicUser,
}: UserSearchSectionProps) {
  return (
    <SectionCard title="Search Users" subtitle="Find public profiles and browse their shared libraries.">
      <div className="space-y-3">
        <div className="flex gap-3">
          <input
            value={userSearch}
            onChange={(e) => setUserSearch?.(e.target.value)}
            placeholder="Search by display name or user id"
            className="field"
          />
          <button onClick={() => searchUsers?.(userSearch)} className="primary-btn">
            Search
          </button>
        </div>
        {userSearchLoading && <p className="text-sm text-zinc-400">Searching users...</p>}
        <div className="space-y-2">
          {userResults.map((profile) => (
            <button
              key={profile.userId}
              onClick={() => loadPublicUser?.(profile.userId)}
              className="user-result-card"
            >
              <div className="user-result-main">
                <div className="user-avatar">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{profile.displayName.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{profile.displayName}</p>
                  <p className="text-xs text-zinc-500 truncate">{profile.userId}</p>
                </div>
              </div>
              <span className="text-xs text-zinc-400">
                {profile.publicFavourites ? "Public favs" : "Profile only"}
              </span>
            </button>
          ))}
          {!userSearchLoading && userResults.length === 0 && (
            <p className="text-sm text-zinc-500">No public users loaded yet.</p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
