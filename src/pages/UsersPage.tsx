import type { Collection, Gif, PublicUserProfile, GifMeta } from "../types";
import { UserSearchSection } from "../components/users/UserSearchSection";
import { PublicProfileView } from "../components/users/PublicProfileView";

interface UsersPageProps {
  userSearch?: string;
  setUserSearch?: (value: string) => void;
  userSearchLoading?: boolean;
  searchUsers?: (query: string) => void;
  userResults?: PublicUserProfile[];
  selectedUserProfile: PublicUserProfile | null;
  selectedUserCollections: Collection[];
  selectedUserFavourites: Gif[];
  selectedUserMetadata?: Record<string, GifMeta>;
  selectedUserLoading: boolean;
  loadPublicUser?: (userId: string) => void;
  selectedUserPublicView?: boolean;
  isFavourited?: (id: string) => boolean;
  onToggleFavourite?: (gif: Gif) => void;
  isQueued?: (id: string) => boolean;
  onQueueToggle?: (gif: Gif) => void;
  onSelectGif?: (gif: Gif) => void;
}

export function UsersPage({
  userSearch = "",
  setUserSearch,
  userSearchLoading = false,
  searchUsers,
  userResults = [],
  selectedUserProfile,
  selectedUserCollections,
  selectedUserFavourites,
  selectedUserMetadata = {},
  selectedUserLoading,
  loadPublicUser,
  selectedUserPublicView = false,
  isFavourited,
  onToggleFavourite,
  isQueued,
  onQueueToggle,
  onSelectGif,
}: UsersPageProps) {
  return (
    <div className="grid xl:grid-cols-[0.85fr_1.15fr] gap-6">
      {!selectedUserPublicView && (
        <UserSearchSection
          userSearch={userSearch}
          setUserSearch={setUserSearch}
          userSearchLoading={userSearchLoading}
          searchUsers={searchUsers}
          userResults={userResults}
          loadPublicUser={loadPublicUser}
        />
      )}
      <PublicProfileView
        selectedUserProfile={selectedUserProfile}
        selectedUserCollections={selectedUserCollections}
        selectedUserFavourites={selectedUserFavourites}
        selectedUserMetadata={selectedUserMetadata}
        selectedUserLoading={selectedUserLoading}
        selectedUserPublicView={selectedUserPublicView}
        isFavourited={isFavourited}
        onToggleFavourite={onToggleFavourite}
        isQueued={isQueued}
        onQueueToggle={onQueueToggle}
        onSelectGif={onSelectGif}
      />
    </div>
  );
}
