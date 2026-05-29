import type { Collection, Gif, PublicUserProfile, GifMeta, ToastProps } from "../types";
import { UsersPage } from "./UsersPage";
import { Toast } from "../components/CardComponents";

interface PublicUserProfilePageProps {
  selectedUserProfile: PublicUserProfile | null;
  selectedUserCollections: Collection[];
  selectedUserFavourites: Gif[];
  selectedUserMetadata?: Record<string, GifMeta>;
  selectedUserLoading: boolean;
  isFavourited: (id: string) => boolean;
  handleToggleFavourite: (gif: Gif) => void;
  isQueued: (id: string) => boolean;
  handleQueueToggle: (gif: Gif) => void;
  setSelectedGif: (gif: Gif | null) => void;
  toast: ToastProps;
}

export function PublicUserProfilePage({
  selectedUserProfile,
  selectedUserCollections,
  selectedUserFavourites,
  selectedUserMetadata,
  selectedUserLoading,
  isFavourited,
  handleToggleFavourite,
  isQueued,
  handleQueueToggle,
  setSelectedGif,
  toast,
}: PublicUserProfilePageProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-white">{selectedUserProfile?.displayName ?? "Public profile"}</h1>
            <p className="text-zinc-500 text-sm mt-1">Shared favourites and public collections</p>
          </div>
          <a href="#/" className="secondary-btn no-underline">
            Back to app
          </a>
        </div>
        <UsersPage
          selectedUserProfile={selectedUserProfile}
          selectedUserCollections={selectedUserCollections}
          selectedUserFavourites={selectedUserFavourites}
          selectedUserMetadata={selectedUserMetadata}
          selectedUserLoading={selectedUserLoading}
          selectedUserPublicView
          isFavourited={isFavourited}
          onToggleFavourite={handleToggleFavourite}
          isQueued={isQueued}
          onQueueToggle={handleQueueToggle}
          onSelectGif={setSelectedGif}
        />
      </main>
      <Toast {...toast} />
    </div>
  );
}
