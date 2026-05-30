export type Page = 'discover' | 'favourites' | 'toolbox' | 'profile' | 'users';
export type MoodFilter = 'all' | 'savage' | 'wholesome' | 'awkward' | 'excited' | 'chaotic' | 'flirty';
export type SyncStatus = 'live' | 'partial' | 'offline';
export type FavouriteSortOption = 'date-added-desc' | 'date-added-asc' | 'most-used' | 'alphabetical' | 'smart-recommendations' | 'shuffle';

export interface GifImage {
  url: string;
  width: string;
  height: string;
  // Animated WebP variant — much smaller than the GIF; present on Giphy results.
  webp?: string;
}

// Static preview frames returned by Giphy (e.g. fixed_height_still).
export interface GifStillImage {
  url: string;
  width: string;
  height: string;
}

export interface Gif {
  id: string;
  title: string;
  images: {
    fixed_height: GifImage;
    fixed_height_still?: GifStillImage;
    original: GifImage;
    fixed_width: GifImage;
    fixed_width_still?: GifStillImage;
    downsized: GifImage;
  };
  username: string;
  rating: string;
  trending_datetime?: string;
}

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'heart';
  visible: boolean;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  color: string;
  gifIds: string[];
}

export interface GifMeta {
  tags: string[];
  notes: string;
  addedAt: string;
  useLater: boolean;
  imported: boolean;
  customSourceUrl?: string;
  collectionIds: string[];
  searchTerms: string[];
}

export interface HistoryEntry {
  gifId: string;
  viewedAt: string;
}

export interface ProfileSettings {
  displayName: string;
  accent: string;
  avatarUrl: string;
  landingPage: Page;
  helperMode: boolean;
  offlineCache: boolean;
  publicProfile: boolean;
  publicFavourites: boolean;
}

export interface Workspace {
  collections: Collection[];
  gifMeta: Record<string, GifMeta>;
  history: HistoryEntry[];
  profile: ProfileSettings;
  manualImports: Gif[];
  clickCounts: Record<string, number>;
}

export interface GiphyUsage {
  hourKey: string;
  count: number;
  lastStatus: number | null;
  lastError: string;
}

export interface FavouriteRow {
  gif_id: string;
  gif_data: Gif;
}

export interface ProfileRow {
  display_name: string | null;
  avatar_url: string | null;
  accent: string | null;
  landing_page: string | null;
  helper_mode: boolean | null;
  offline_cache: boolean | null;
  public_profile?: boolean | null;
  public_favourites?: boolean | null;
}

export interface CollectionRow {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_public: boolean;
}

export interface CollectionItemRow {
  collection_id: string;
  gif_id: string;
  position: number;
}

export interface GifMetadataRow {
  gif_id: string;
  notes: string | null;
  tags: string[] | null;
  use_later: boolean;
  imported: boolean;
  custom_source_url: string | null;
  search_terms: string[] | null;
  updated_at: string;
}

export interface HistoryRow {
  gif_id: string;
  viewed_at: string;
}

export interface GifAssetRow {
  gif_id: string;
  gif_data: Gif;
}

export interface PublicUserProfile {
  userId: string;
  displayName: string;
  avatarUrl: string;
  accent: string;
  publicFavourites: boolean;
}
