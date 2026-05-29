import type { Collection, Workspace } from "../types";

export const LEGACY_FAVOURITES_KEY = "gif_studio_favourites";
export const MIGRATION_FLAG_KEY = "gif_studio_favourites_migrated";
export const CACHE_KEY = "gif_studio_cached_favourites";
export const WORKSPACE_CACHE_KEY = "gif_studio_workspace_cache";
export const DEFAULT_COLLECTION_ID = "all-favourites";
export const QUEUE_COLLECTION_ID = "queue";
export const SHARED_COLLECTION_ID = "shared-reactions";

export const STARTER_COLLECTIONS: Collection[] = [
  {
    id: "starter-funniest",
    name: "Funniest Reactions",
    description: "Quick reactions for jokes and chaotic replies.",
    isPublic: true,
    color: "#f97316",
    gifIds: [],
  },
  {
    id: "starter-romantic",
    name: "Romantic Replies",
    description: "Love, blushing, and sweet reply energy.",
    isPublic: true,
    color: "#ec4899",
    gifIds: [],
  },
  {
    id: "starter-dramatic",
    name: "Dramatic Exits",
    description: "Big reactions for big moments.",
    isPublic: true,
    color: "#8b5cf6",
    gifIds: [],
  },
  {
    id: "starter-awkward",
    name: "Awkward Silences",
    description: "Perfect for side-eyes and slow blinks.",
    isPublic: true,
    color: "#14b8a6",
    gifIds: [],
  },
];

export function createDefaultWorkspace(): Workspace {
  return {
    collections: [
      {
        id: DEFAULT_COLLECTION_ID,
        name: "All Favourites",
        description: "Your synced saved GIFs.",
        isPublic: false,
        color: "#db2777",
        gifIds: [],
      },
      {
        id: QUEUE_COLLECTION_ID,
        name: "Use Later Queue",
        description: "Temporary saves before making them permanent.",
        isPublic: false,
        color: "#8b5cf6",
        gifIds: [],
      },
      {
        id: SHARED_COLLECTION_ID,
        name: "Shared Reactions",
        description: "Team-ready and shareable reaction picks.",
        isPublic: true,
        color: "#06b6d4",
        gifIds: [],
      },
      ...STARTER_COLLECTIONS,
    ],
    gifMeta: {},
    history: [],
    profile: {
      displayName: "Creator",
      accent: "#a855f7",
      avatarUrl: "",
      landingPage: "discover",
      helperMode: false,
      offlineCache: true,
      publicProfile: true,
      publicFavourites: true,
    },
    manualImports: [],
    clickCounts: {},
  };
}

export function normalizeAvatarUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.includes("i.ibb.co/")) return trimmed;
  const match = trimmed.match(/^https?:\/\/(?:www\.)?ibb\.co\/([A-Za-z0-9]+)(?:\/.*)?$/i);
  if (match) return `https://i.ibb.co/${match[1]}/image.png`;
  return trimmed;
}

export function ensureSystemCollections(collections: Collection[]): Collection[] {
  const defaults = createDefaultWorkspace().collections;
  return [
    ...collections,
    ...defaults.filter((item) => !collections.some((existing) => existing.id === item.id)),
  ].map((collection) => ({
    ...collection,
    gifIds: collection.gifIds ?? [],
  }));
}

export function readWorkspaceCache(): Partial<Workspace> | null {
  try {
    const stored = localStorage.getItem(WORKSPACE_CACHE_KEY);
    return stored ? (JSON.parse(stored) as Partial<Workspace>) : null;
  } catch {
    return null;
  }
}
