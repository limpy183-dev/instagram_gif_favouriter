import { useCallback, useEffect, useState, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";
import type {
  Workspace,
  Gif,
  GifMeta,
  Collection,
  ProfileSettings,
  SyncStatus,
  FavouriteRow,
  CollectionRow,
  CollectionItemRow,
  GifMetadataRow,
  HistoryRow,
  GifAssetRow,
  ProfileRow,
} from "../types";

const LEGACY_FAVOURITES_KEY = "gif_studio_favourites";
const MIGRATION_FLAG_KEY = "gif_studio_favourites_migrated";
const CACHE_KEY = "gif_studio_cached_favourites";
const WORKSPACE_CACHE_KEY = "gif_studio_workspace_cache";
const DEFAULT_COLLECTION_ID = "all-favourites";
const QUEUE_COLLECTION_ID = "queue";
const SHARED_COLLECTION_ID = "shared-reactions";

const STARTER_COLLECTIONS: Collection[] = [
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

function ensureSystemCollections(collections: Collection[]): Collection[] {
  const defaults = createDefaultWorkspace().collections;
  return [
    ...collections,
    ...defaults.filter((item) => !collections.some((existing) => existing.id === item.id)),
  ].map((collection) => ({
    ...collection,
    gifIds: collection.gifIds ?? [],
  }));
}

function readWorkspaceCache(): Partial<Workspace> | null {
  try {
    const stored = localStorage.getItem(WORKSPACE_CACHE_KEY);
    return stored ? (JSON.parse(stored) as Partial<Workspace>) : null;
  } catch {
    return null;
  }
}

export function useWorkspace(
  user: User | null,
  showToast: (msg: string, type?: "success" | "error" | "info" | "heart") => void
) {
  const [workspace, setWorkspace] = useState<Workspace>(createDefaultWorkspace());
  const [favourites, setFavourites] = useState<Gif[]>([]);
  const [favouritesLoading, setFavouritesLoading] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceOffline, setWorkspaceOffline] = useState(false);
  const [favouritesOffline, setFavouritesOffline] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [retryingSync, setRetryingSync] = useState(false);
  const [migrationChecked, setMigrationChecked] = useState(false);

  const favouritesRef = useRef<Gif[]>([]);
  useEffect(() => {
    favouritesRef.current = favourites;
  }, [favourites]);

  const saveProfile = useCallback(
    async (profile: ProfileSettings) => {
      if (!user) return;
      const nextProfile = { ...profile, avatarUrl: profile.avatarUrl.trim() };
      
      const payload: any = {
        id: user.id,
        display_name: nextProfile.displayName,
        avatar_url: normalizeAvatarUrl(nextProfile.avatarUrl),
        accent: nextProfile.accent,
        landing_page: nextProfile.landingPage,
        helper_mode: nextProfile.helperMode,
        offline_cache: nextProfile.offlineCache,
        public_profile: nextProfile.publicProfile,
        public_favourites: nextProfile.publicFavourites,
      };

      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

      if (error && (error.message?.includes("public_profile") || error.message?.includes("public_favourites"))) {
        console.warn("Failed to upsert profiles with privacy columns, falling back...", error);
        delete payload.public_profile;
        delete payload.public_favourites;
        const { error: fallbackError } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
        if (fallbackError) {
          console.error("Fallback saveProfile failed:", fallbackError);
        }
      } else if (error) {
        console.error("saveProfile failed:", error);
      }
    },
    [user]
  );

  const saveCollection = useCallback(
    async (collection: Collection) => {
      if (!user || collection.id === DEFAULT_COLLECTION_ID) return;
      await supabase.from("collections").upsert(
        {
          id: collection.id,
          user_id: user.id,
          name: collection.name,
          description: collection.description,
          color: collection.color,
          is_public: collection.isPublic,
        },
        { onConflict: "id" }
      );
      await supabase.from("collection_items").delete().eq("user_id", user.id).eq("collection_id", collection.id);
      if (collection.gifIds.length > 0) {
        await supabase.from("collection_items").insert(
          collection.gifIds.map((gifId, index) => ({
            collection_id: collection.id,
            user_id: user.id,
            gif_id: gifId,
            position: index,
          }))
        );
      }
    },
    [user]
  );

  const saveGifMeta = useCallback(
    async (gifId: string, meta: GifMeta) => {
      if (!user) return;
      await supabase.from("gif_metadata").upsert(
        {
          user_id: user.id,
          gif_id: gifId,
          notes: meta.notes,
          tags: meta.tags,
          use_later: meta.useLater,
          imported: meta.imported,
          custom_source_url: meta.customSourceUrl ?? null,
          search_terms: meta.searchTerms ?? [],
        },
        { onConflict: "user_id,gif_id" }
      );
    },
    [user]
  );

  const saveGifAsset = useCallback(
    async (gif: Gif) => {
      if (!user) return;
      await supabase
        .from("gif_assets")
        .upsert({ user_id: user.id, gif_id: gif.id, gif_data: gif }, { onConflict: "user_id,gif_id" });
    },
    [user]
  );

  const saveHistory = useCallback(
    async (gifId: string) => {
      if (!user) return;
      await supabase.from("view_history").insert({ user_id: user.id, gif_id: gifId });
    },
    [user]
  );

  const loadWorkspace = useCallback(async () => {
    if (!user) return;
    setWorkspaceLoading(true);

    const fetchProfileRow = async () => {
      const res = await supabase
        .from("profiles")
        .select(
          "display_name, avatar_url, accent, landing_page, helper_mode, offline_cache, public_profile, public_favourites"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (
        res.error &&
        (res.error.message?.includes("public_profile") ||
          res.error.message?.includes("public_favourites"))
      ) {
        console.warn(
          "Profiles columns public_profile/public_favourites not found, falling back...",
          res.error
        );
        return supabase
          .from("profiles")
          .select("display_name, avatar_url, accent, landing_page, helper_mode, offline_cache")
          .eq("id", user.id)
          .maybeSingle();
      }
      return res;
    };

    const [profileRes, collectionsRes, itemsRes, metadataRes, historyRes, assetsRes] = await Promise.all([
      fetchProfileRow(),
      supabase.from("collections").select("id, name, description, color, is_public").eq("user_id", user.id),
      supabase
        .from("collection_items")
        .select("collection_id, gif_id, position")
        .eq("user_id", user.id)
        .order("position", { ascending: true }),
      supabase
        .from("gif_metadata")
        .select("gif_id, notes, tags, use_later, imported, custom_source_url, search_terms, updated_at")
        .eq("user_id", user.id),
      supabase
        .from("view_history")
        .select("gif_id, viewed_at")
        .eq("user_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(30),
      supabase.from("gif_assets").select("gif_id, gif_data").eq("user_id", user.id),
    ]);

    const defaultWorkspace = createDefaultWorkspace();
    const cachedWorkspace = readWorkspaceCache();
    const hasWorkspaceError = Boolean(
      profileRes.error ||
        collectionsRes.error ||
        itemsRes.error ||
        metadataRes.error ||
        historyRes.error ||
        assetsRes.error
    );

    if (hasWorkspaceError && cachedWorkspace) {
      setWorkspace({
        collections: ensureSystemCollections(
          (cachedWorkspace.collections as Collection[] | undefined) ?? defaultWorkspace.collections
        ),
        gifMeta: cachedWorkspace.gifMeta ?? {},
        history: cachedWorkspace.history ?? [],
        profile: cachedWorkspace.profile
          ? { ...defaultWorkspace.profile, ...cachedWorkspace.profile }
          : defaultWorkspace.profile,
        manualImports: (cachedWorkspace.manualImports as Gif[] | undefined) ?? [],
      });
      setWorkspaceOffline(true);
      setWorkspaceLoading(false);
      return;
    }

    const profile = profileRes.data as ProfileRow | null;
    const persistedAvatar = normalizeAvatarUrl(
      profile?.avatar_url ?? cachedWorkspace?.profile?.avatarUrl ?? defaultWorkspace.profile.avatarUrl
    );
    const collectionsRows = (collectionsRes.data ?? []) as CollectionRow[];
    const itemRows = (itemsRes.data ?? []) as CollectionItemRow[];
    const metadataRows = (metadataRes.data ?? []) as GifMetadataRow[];
    const historyRows = (historyRes.data ?? []) as HistoryRow[];
    const assetRows = (assetsRes.data ?? []) as GifAssetRow[];

    const collectionMap = new Map<string, string[]>();
    itemRows.forEach((item) => {
      const existing = collectionMap.get(item.collection_id) ?? [];
      collectionMap.set(item.collection_id, [...existing, item.gif_id]);
    });

    const syncedCollections = ensureSystemCollections(
      collectionsRows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? "",
        color: row.color ?? "#a855f7",
        isPublic: row.is_public,
        gifIds: collectionMap.get(row.id) ?? [],
      }))
    );

    const mergedCollections = ensureSystemCollections([
      ...syncedCollections,
      ...defaultWorkspace.collections.filter(
        (collection) => !syncedCollections.some((existing) => existing.id === collection.id)
      ),
    ]);

    const gifMeta: Record<string, GifMeta> = {};
    metadataRows.forEach((row) => {
      gifMeta[row.gif_id] = {
        tags: row.tags ?? [],
        notes: row.notes ?? "",
        addedAt: row.updated_at,
        useLater: row.use_later,
        imported: row.imported,
        customSourceUrl: row.custom_source_url ?? undefined,
        collectionIds: mergedCollections.filter((collection) => collection.gifIds.includes(row.gif_id)).map((collection) => collection.id),
        searchTerms: row.search_terms ?? [],
      };
    });

    // Solve Bug B (Manual Imports Sync): Get manual imports from remote gif_assets
    const manualImports = assetRows
      .map((row) => row.gif_data)
      .filter((gif) => gif.username === "manual-import");

    const nextWorkspace: Workspace = {
      collections: mergedCollections,
      gifMeta,
      history: historyRows.map((row) => ({ gifId: row.gif_id, viewedAt: row.viewed_at })),
      profile: {
        displayName: profile?.display_name ?? cachedWorkspace?.profile?.displayName ?? defaultWorkspace.profile.displayName,
        avatarUrl: persistedAvatar,
        accent: profile?.accent ?? cachedWorkspace?.profile?.accent ?? defaultWorkspace.profile.accent,
        landingPage: (profile?.landing_page as any) ?? cachedWorkspace?.profile?.landingPage ?? defaultWorkspace.profile.landingPage,
        helperMode: profile?.helper_mode ?? cachedWorkspace?.profile?.helperMode ?? defaultWorkspace.profile.helperMode,
        offlineCache: profile?.offline_cache ?? cachedWorkspace?.profile?.offlineCache ?? defaultWorkspace.profile.offlineCache,
        publicProfile: profile?.public_profile ?? cachedWorkspace?.profile?.publicProfile ?? defaultWorkspace.profile.publicProfile,
        publicFavourites: profile?.public_favourites ?? cachedWorkspace?.profile?.publicFavourites ?? defaultWorkspace.profile.publicFavourites,
      },
      manualImports,
    };

    const queueCollection = nextWorkspace.collections.find((c) => c.id === QUEUE_COLLECTION_ID);
    if (queueCollection && queueCollection.gifIds.length === 0) {
      queueCollection.gifIds = Object.entries(gifMeta)
        .filter(([_, meta]) => meta.useLater)
        .map(([id]) => id);
    }

    setWorkspace(nextWorkspace);
    localStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(nextWorkspace));
    setWorkspaceOffline(false);
    setLastSyncAt(new Date().toISOString());
    setWorkspaceLoading(false);
  }, [user]);

  const loadFavourites = useCallback(async () => {
    if (!user) {
      setFavourites([]);
      setMigrationChecked(false);
      return;
    }
    setFavouritesLoading(true);
    const { data, error } = await supabase
      .from("favourites")
      .select("gif_id, gif_data")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        setFavourites(cached ? (JSON.parse(cached) as Gif[]) : []);
      } catch {
        setFavourites([]);
      }
      setFavouritesOffline(true);
      showToast("Loaded offline cache because Supabase was unavailable.", "info");
      setFavouritesLoading(false);
      setMigrationChecked(true);
      return;
    }

    const rows = (data ?? []) as FavouriteRow[];
    const nextFavourites = rows.map((row) => row.gif_data);
    setFavourites(nextFavourites);
    localStorage.setItem(CACHE_KEY, JSON.stringify(nextFavourites));
    setFavouritesOffline(false);
    setLastSyncAt(new Date().toISOString());
    setFavouritesLoading(false);
    setMigrationChecked(true);
  }, [user, showToast]);

  const retrySync = async () => {
    if (!user) return;
    setRetryingSync(true);
    try {
      await Promise.all([loadFavourites(), loadWorkspace()]);
    } finally {
      setRetryingSync(false);
    }
  };

  const updateProfileField = async (nextProfile: ProfileSettings) => {
    const normalizedProfile = { ...nextProfile, avatarUrl: normalizeAvatarUrl(nextProfile.avatarUrl) };
    setWorkspace((current) => ({ ...current, profile: normalizedProfile }));
    await saveProfile(normalizedProfile);
  };

  const ensureMeta = useCallback((gif: Gif) => {
    setWorkspace((current) => {
      if (current.gifMeta[gif.id]) return current;
      return {
        ...current,
        gifMeta: {
          ...current.gifMeta,
          [gif.id]: {
            tags: [],
            notes: "",
            addedAt: new Date().toISOString(),
            useLater: false,
            imported: gif.username === "manual-import",
            customSourceUrl: gif.username === "manual-import" ? gif.images.original.url : undefined,
            collectionIds: [DEFAULT_COLLECTION_ID],
            searchTerms: [],
          },
        },
      };
    });
  }, []);

  const updateMeta = async (gif: Gif, updater: (meta: GifMeta) => GifMeta) => {
    ensureMeta(gif);
    const nextMeta = updater(
      workspace.gifMeta[gif.id] ?? {
        tags: [],
        notes: "",
        addedAt: new Date().toISOString(),
        useLater: false,
        imported: false,
        collectionIds: [],
        searchTerms: [],
      }
    );
    setWorkspace((current) => ({ ...current, gifMeta: { ...current.gifMeta, [gif.id]: nextMeta } }));
    await saveGifMeta(gif.id, nextMeta);
  };

  const addHistory = async (gif: Gif) => {
    ensureMeta(gif);
    setWorkspace((current) => ({
      ...current,
      history: [
        { gifId: gif.id, viewedAt: new Date().toISOString() },
        ...current.history.filter((item) => item.gifId !== gif.id),
      ].slice(0, 30),
    }));
    await saveHistory(gif.id);
  };

  const handleToggleFavourite = async (gif: Gif, searchTerm?: string) => {
    if (!user) return;
    const exists = favourites.some((item) => item.id === gif.id);
    if (exists) {
      const previous = favourites;
      setFavourites((current) => current.filter((item) => item.id !== gif.id));
      setWorkspace((current) => ({
        ...current,
        collections: current.collections.map((collection) =>
          collection.id === DEFAULT_COLLECTION_ID
            ? { ...collection, gifIds: collection.gifIds.filter((id) => id !== gif.id) }
            : collection
        ),
        gifMeta: current.gifMeta[gif.id]
          ? {
              ...current.gifMeta,
              [gif.id]: {
                ...current.gifMeta[gif.id],
                collectionIds: (current.gifMeta[gif.id]?.collectionIds ?? []).filter(
                  (id) => id !== DEFAULT_COLLECTION_ID
                ),
              },
            }
          : current.gifMeta,
      }));
      const { error } = await supabase.from("favourites").delete().eq("user_id", user.id).eq("gif_id", gif.id);
      if (error) {
        setFavourites(previous);
        showToast("Failed to remove favourite.", "error");
        return;
      }
      showToast("Removed from Favourites", "info");
      return;
    }
    setFavourites((current) => [gif, ...current]);
    ensureMeta(gif);
    const trimmedSearch = searchTerm?.trim() ?? "";
    let nextMetaForSync: GifMeta | null = null;
    setWorkspace((current) => {
      const currentDefaultIds = current.collections.find((item) => item.id === DEFAULT_COLLECTION_ID)?.gifIds ?? [];
      const nextDefaultIds = Array.from(new Set([gif.id, ...currentDefaultIds]));
      const currentMeta = current.gifMeta[gif.id] ?? {
        tags: [],
        notes: "",
        addedAt: new Date().toISOString(),
        useLater: false,
        imported: false,
        collectionIds: [],
        searchTerms: [],
      };
      const nextMeta: GifMeta = {
        ...currentMeta,
        collectionIds: Array.from(new Set([DEFAULT_COLLECTION_ID, ...(currentMeta.collectionIds ?? [])])),
        searchTerms: trimmedSearch
          ? Array.from(new Set([...(currentMeta.searchTerms ?? []), trimmedSearch]))
          : currentMeta.searchTerms ?? [],
      };
      nextMetaForSync = nextMeta;
      return {
        ...current,
        collections: current.collections.map((collection) =>
          collection.id === DEFAULT_COLLECTION_ID ? { ...collection, gifIds: nextDefaultIds } : collection
        ),
        gifMeta: { ...current.gifMeta, [gif.id]: nextMeta },
      };
    });
    await supabase.from("favourites").upsert({ user_id: user.id, gif_id: gif.id, gif_data: gif }, { onConflict: "user_id,gif_id" });
    if (nextMetaForSync) await saveGifMeta(gif.id, nextMetaForSync);
    showToast("Added to Favourites ♥", "heart");
  };

  const handleQueueToggle = async (gif: Gif) => {
    ensureMeta(gif);
    const wasQueued = workspace.gifMeta[gif.id]?.useLater ?? false;
    const queueIds = workspace.collections.find((collection) => collection.id === QUEUE_COLLECTION_ID)?.gifIds ?? [];
    const nextQueueIds = wasQueued ? queueIds.filter((id) => id !== gif.id) : [gif.id, ...queueIds.filter((id) => id !== gif.id)];

    setWorkspace((current) => ({
      ...current,
      collections: current.collections.map((collection) =>
        collection.id === QUEUE_COLLECTION_ID ? { ...collection, gifIds: nextQueueIds } : collection
      ),
      gifMeta: {
        ...current.gifMeta,
        [gif.id]: {
          ...(current.gifMeta[gif.id] ?? {
            tags: [],
            notes: "",
            addedAt: new Date().toISOString(),
            useLater: false,
            imported: false,
            collectionIds: [],
            searchTerms: [],
          }),
          useLater: !wasQueued,
        },
      },
    }));
    await saveCollection({
      ...workspace.collections.find((item) => item.id === QUEUE_COLLECTION_ID)!,
      gifIds: nextQueueIds,
    });
    await saveGifMeta(gif.id, {
      ...(workspace.gifMeta[gif.id] ?? {
        tags: [],
        notes: "",
        addedAt: new Date().toISOString(),
        useLater: false,
        imported: false,
        collectionIds: [],
        searchTerms: [],
      }),
      useLater: !wasQueued,
    });
  };

  const addCollection = async (name: string, desc: string, isPublic: boolean) => {
    const next: Collection = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: desc.trim(),
      isPublic,
      color: workspace.profile.accent,
      gifIds: [],
    };
    setWorkspace((current) => ({ ...current, collections: [...current.collections, next] }));
    await saveCollection(next);
    showToast("Collection created", "success");
  };

  const updateCollectionVisibility = async (collectionId: string, isPublic: boolean) => {
    setWorkspace((current) => ({
      ...current,
      collections: current.collections.map((collection) =>
        collection.id === collectionId ? { ...collection, isPublic } : collection
      ),
    }));
    const collection = workspace.collections.find((item) => item.id === collectionId);
    if (collection) await saveCollection({ ...collection, isPublic });
  };

  const addGifToCollection = async (gif: Gif, collectionId: string) => {
    ensureMeta(gif);
    const collection = workspace.collections.find((item) => item.id === collectionId);
    if (!collection) return;
    const nextGifIds = Array.from(new Set([gif.id, ...collection.gifIds]));
    const nextCollectionIds = Array.from(
      new Set([collectionId, ...(workspace.gifMeta[gif.id]?.collectionIds ?? [DEFAULT_COLLECTION_ID])])
    );
    setWorkspace((current) => ({
      ...current,
      collections: current.collections.map((item) =>
        item.id === collectionId ? { ...item, gifIds: nextGifIds } : item
      ),
      gifMeta: {
        ...current.gifMeta,
        [gif.id]: {
          ...(current.gifMeta[gif.id] ?? {
            tags: [],
            notes: "",
            addedAt: new Date().toISOString(),
            useLater: false,
            imported: false,
            collectionIds: [],
            searchTerms: [],
          }),
          collectionIds: nextCollectionIds,
        },
      },
    }));
    await saveCollection({ ...collection, gifIds: nextGifIds });
    await saveGifMeta(gif.id, {
      ...(workspace.gifMeta[gif.id] ?? {
        tags: [],
        notes: "",
        addedAt: new Date().toISOString(),
        useLater: false,
        imported: false,
        collectionIds: [],
        searchTerms: [],
      }),
      collectionIds: nextCollectionIds,
    });
    showToast(`Added to ${collection.name}`, "success");
  };

  const removeGifFromCollection = async (gif: Gif, collectionId: string) => {
    const collection = workspace.collections.find((item) => item.id === collectionId);
    if (!collection) return;
    const nextGifIds = collection.gifIds.filter((id) => id !== gif.id);
    const nextCollectionIds = (workspace.gifMeta[gif.id]?.collectionIds ?? []).filter((id) => id !== collectionId);

    setWorkspace((current) => ({
      ...current,
      collections: current.collections.map((item) =>
        item.id === collectionId ? { ...item, gifIds: nextGifIds } : item
      ),
      gifMeta: current.gifMeta[gif.id]
        ? {
            ...current.gifMeta,
            [gif.id]: {
              ...current.gifMeta[gif.id],
              collectionIds: nextCollectionIds,
            },
          }
        : current.gifMeta,
    }));
    await saveCollection({ ...collection, gifIds: nextGifIds });
    await saveGifMeta(gif.id, {
      ...(workspace.gifMeta[gif.id] ?? {
        tags: [],
        notes: "",
        addedAt: new Date().toISOString(),
        useLater: false,
        imported: false,
        collectionIds: [],
        searchTerms: [],
      }),
      collectionIds: nextCollectionIds,
    });
    showToast(`Removed from ${collection.name}`, "info");
  };

  const reorderQueue = async (direction: "up" | "down", gifId: string) => {
    const queue = workspace.collections.find((item) => item.id === QUEUE_COLLECTION_ID);
    if (!queue) return;
    const index = queue.gifIds.indexOf(gifId);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || target < 0 || target >= queue.gifIds.length) return;
    const nextIds = [...queue.gifIds];
    const [moved] = nextIds.splice(index, 1);
    nextIds.splice(target, 0, moved);
    setWorkspace((current) => ({
      ...current,
      collections: current.collections.map((item) =>
        item.id === QUEUE_COLLECTION_ID ? { ...item, gifIds: nextIds } : item
      ),
    }));
    await saveCollection({ ...queue, gifIds: nextIds });
  };

  const importExternalGif = async (title: string, url: string) => {
    if (!url.trim()) return;
    const id = `import-${crypto.randomUUID()}`;
    const gif: Gif = {
      id,
      title: title.trim() || "Imported GIF",
      username: "manual-import",
      rating: "g",
      images: {
        fixed_height: { url, width: "320", height: "240" },
        original: { url, width: "320", height: "240" },
        fixed_width: { url, width: "320", height: "240" },
        downsized: { url, width: "320", height: "240" },
      },
    };
    const meta: GifMeta = {
      tags: ["imported"],
      notes: "Imported from external URL",
      addedAt: new Date().toISOString(),
      useLater: false,
      imported: true,
      customSourceUrl: url,
      collectionIds: [SHARED_COLLECTION_ID],
      searchTerms: [],
    };
    const sharedIds = [gif.id, ...(workspace.collections.find((item) => item.id === SHARED_COLLECTION_ID)?.gifIds ?? [])];

    setWorkspace((current) => ({
      ...current,
      manualImports: [gif, ...current.manualImports],
      gifMeta: { ...current.gifMeta, [gif.id]: meta },
      collections: current.collections.map((collection) =>
        collection.id === SHARED_COLLECTION_ID ? { ...collection, gifIds: sharedIds } : collection
      ),
    }));
    await saveGifAsset(gif);
    await saveCollection({
      ...workspace.collections.find((item) => item.id === SHARED_COLLECTION_ID)!,
      gifIds: sharedIds,
    });
    await saveGifMeta(gif.id, meta);
    showToast("External GIF imported", "success");
  };

  const handleClearAll = async () => {
    if (!user || favourites.length === 0) return;
    const [favRes, itemsRes, metaRes] = await Promise.all([
      supabase.from("favourites").delete().eq("user_id", user.id),
      supabase.from("collection_items").delete().eq("user_id", user.id),
      supabase.from("gif_metadata").delete().eq("user_id", user.id),
    ]);
    if (favRes.error || itemsRes.error || metaRes.error) {
      showToast("Failed to clear favourites from database.", "error");
      return;
    }
    setFavourites([]);
    setWorkspace((current) => ({
      ...current,
      collections: current.collections.map((collection) => ({ ...collection, gifIds: [] })),
      gifMeta: {},
    }));
    showToast("All favourites and collection mappings cleared", "info");
  };

  const syncStatus: SyncStatus =
    workspaceOffline && favouritesOffline ? "offline" : workspaceOffline || favouritesOffline ? "partial" : "live";

  useEffect(() => {
    if (user) {
      void loadWorkspace();
      void loadFavourites();
    }
  }, [user, loadWorkspace, loadFavourites]);

  useEffect(() => {
    if (workspace.profile.offlineCache) {
      localStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(workspace));
    }
  }, [workspace]);

  // Migration logic
  useEffect(() => {
    if (!user || !migrationChecked) return;
    if (localStorage.getItem(MIGRATION_FLAG_KEY) === "true") return;
    let legacyFavourites: Gif[] = [];
    try {
      const stored = localStorage.getItem(LEGACY_FAVOURITES_KEY);
      legacyFavourites = stored ? (JSON.parse(stored) as Gif[]) : [];
    } catch {
      localStorage.setItem(MIGRATION_FLAG_KEY, "true");
      return;
    }
    if (legacyFavourites.length === 0) {
      localStorage.setItem(MIGRATION_FLAG_KEY, "true");
      return;
    }
    const newLegacyFavourites = legacyFavourites.filter((legacy) => !favourites.some((fav) => fav.id === legacy.id));
    if (newLegacyFavourites.length === 0) {
      localStorage.setItem(MIGRATION_FLAG_KEY, "true");
      return;
    }
    void supabase
      .from("favourites")
      .upsert(
        newLegacyFavourites.map((gif) => ({ user_id: user.id, gif_id: gif.id, gif_data: gif })),
        { onConflict: "user_id,gif_id" }
      )
      .then(({ error }) => {
        if (error) {
          showToast("Failed to migrate local favourites.", "error");
          return;
        }
        setFavourites((current) => [...current, ...newLegacyFavourites]);
        localStorage.setItem(MIGRATION_FLAG_KEY, "true");
        showToast(`Migrated ${newLegacyFavourites.length} local favourites`, "success");
      });
  }, [user, migrationChecked, favourites, showToast]);

  return {
    workspace,
    favourites,
    favouritesLoading,
    workspaceLoading,
    syncStatus,
    lastSyncAt,
    retryingSync,
    workspaceOffline,
    favouritesOffline,
    setWorkspace,
    setFavourites,
    updateProfileField,
    updateMeta,
    addHistory,
    handleToggleFavourite,
    handleQueueToggle,
    addCollection,
    updateCollectionVisibility,
    addGifToCollection,
    removeGifFromCollection,
    reorderQueue,
    importExternalGif,
    handleClearAll,
    retrySync,
  };
}
