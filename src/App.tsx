import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import AuthPage from "./AuthPage";
import { supabase } from "./utils/supabase";
import { DiscoverPage } from "./pages/DiscoverPage";
import { FavouritesPage } from "./pages/FavouritesPage";
import { ToolboxPage } from "./pages/ToolboxPage";
import { ProfilePage } from "./pages/ProfilePage";
import { UsersPage } from "./pages/UsersPage";

import type {
  Page,
  Gif,
  Collection,
  PublicUserProfile,
  ToastProps,
  MoodFilter,
  FavouriteSortOption,
  GifMeta,
} from "./types";

import { useGiphy } from "./hooks/useGiphy";
import { useWorkspace } from "./hooks/useWorkspace";
import { normalizeAvatarUrl } from "./utils/workspaceHelpers";
import { Toast, SkeletonCard } from "./components/CardComponents";
import { MasonryGrid } from "./components/MasonryGrid";
import { GifModal } from "./components/GifModal";

import {
  SearchIcon,
  XIcon,
} from "./components/Icons";
import { Header } from "./components/Layout/Header";
import { Footer } from "./components/Layout/Footer";
import { PublicCollectionPage } from "./pages/PublicCollectionPage";
import { PublicUserProfilePage } from "./pages/PublicUserProfilePage";
import { useHashRoute, parseHashRoute } from "./hooks/useHashRoute";

const CATEGORIES = [
  { label: "🔥 Trending", value: "" },
  { label: "😂 Funny", value: "funny" },
  { label: "💖 Love", value: "love" },
  { label: "🎉 Celebrate", value: "celebrate" },
  { label: "😮 Shocked", value: "shocked" },
  { label: "🐱 Animals", value: "animals" },
  { label: "💪 Motivation", value: "motivation" },
  { label: "🎮 Gaming", value: "gaming" },
  { label: "🍕 Food", value: "food" },
  { label: "🌊 Vibes", value: "vibes" },
];

const MOOD_PRESETS: Array<{ label: string; value: MoodFilter; keywords: string[] }> = [
  { label: "All moods", value: "all", keywords: [] },
  { label: "Savage", value: "savage", keywords: ["eye roll", "sassy", "mic drop"] },
  { label: "Wholesome", value: "wholesome", keywords: ["hug", "love", "cute"] },
  { label: "Awkward", value: "awkward", keywords: ["cringe", "nervous", "side eye"] },
  { label: "Excited", value: "excited", keywords: ["party", "celebrate", "hyped"] },
  { label: "Chaotic", value: "chaotic", keywords: ["wild", "panic", "mess"] },
  { label: "Flirty", value: "flirty", keywords: ["wink", "kiss", "romance"] },
];

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [page, setPage] = useState<Page>("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [favouriteSearch, setFavouriteSearch] = useState("");
  const [filterTag, setFilterTag] = useState("all");
  const [filterCollectionId, setFilterCollectionId] = useState("all");
  const [filterRating, setFilterRating] = useState("all");
  const [filterUsername, setFilterUsername] = useState("all");
  const [moodFilter, setMoodFilter] = useState<MoodFilter>("all");
  const [sortOption, setSortOption] = useState<FavouriteSortOption>("date-added-desc");
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const [toast, setToast] = useState<ToastProps>({ message: "", type: "success", visible: false });
  const showToast = useCallback((message: string, type: ToastProps["type"] = "success") => {
    setToast({ message, type, visible: true });
    window.setTimeout(() => setToast((current) => ({ ...current, visible: false })), 3000);
  }, []);

  // Wire up the custom useGiphy hook
  const {
    gifs,
    loading,
    loadingMore,
    hasMore,
    offset,
    giphyUsage,
    fetchGifs,
    setOffset,
  } = useGiphy(moodFilter, showToast);

  // Wire up the custom useWorkspace hook
  const {
    workspace,
    favourites,
    favouritesLoading,
    workspaceLoading,
    syncStatus,
    lastSyncAt,
    retryingSync,
    workspaceOffline,
    favouritesOffline,
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
  } = useWorkspace(user, showToast);

  // Presentational and other local App states
  const [selectedGif, setSelectedGif] = useState<Gif | null>(null);
  const [activeCategory, setActiveCategory] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [newCollectionPublic, setNewCollectionPublic] = useState(false);
  const [manualImportUrl, setManualImportUrl] = useState("");
  const [manualImportTitle, setManualImportTitle] = useState("");
  const [publicCollection, setPublicCollection] = useState<Collection | null>(null);
  const [publicCollectionGifs, setPublicCollectionGifs] = useState<Gif[]>([]);
  const [publicCollectionLoading, setPublicCollectionLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userResults, setUserResults] = useState<PublicUserProfile[]>([]);
  const [selectedUserProfile, setSelectedUserProfile] = useState<PublicUserProfile | null>(null);
  const [selectedUserCollections, setSelectedUserCollections] = useState<Collection[]>([]);
  const [selectedUserFavourites, setSelectedUserFavourites] = useState<Gif[]>([]);
  const [selectedUserMetadata, setSelectedUserMetadata] = useState<Record<string, GifMeta>>({});
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const [showSyncDetails, setShowSyncDetails] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const syncPanelRef = useRef<HTMLDivElement>(null);
  const initialLandingAppliedRef = useRef(false);

  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const route = useHashRoute(hash);

  const searchUsers = useCallback(async (query: string = "") => {
    const trimmed = query.trim();
    setUserSearchLoading(true);
    
    let queryBuilder = supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, accent, public_profile, public_favourites");

    if (trimmed) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
      if (isUuid) {
        queryBuilder = queryBuilder.or(`display_name.ilike.%${trimmed}%,user_id.eq.${trimmed}`);
      } else {
        queryBuilder = queryBuilder.ilike("display_name", `%${trimmed}%`);
      }
    }

    // Filter by public_profile = true or public_profile IS NULL (by default they are public)
    queryBuilder = queryBuilder.or("public_profile.eq.true,public_profile.is.null");

    const { data, error } = await queryBuilder.limit(20);

    if (error) {
      console.warn("Profiles query failed, falling back to query without privacy columns...", error);
      let fallbackQuery = supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, accent");

      if (trimmed) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
        if (isUuid) {
          fallbackQuery = fallbackQuery.or(`display_name.ilike.%${trimmed}%,user_id.eq.${trimmed}`);
        } else {
          fallbackQuery = fallbackQuery.ilike("display_name", `%${trimmed}%`);
        }
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery.limit(20);

      if (fallbackError) {
        console.error("Fallback profiles search failed:", fallbackError);
        setUserResults([]);
      } else {
        setUserResults(
          ((fallbackData ?? []) as Array<{ user_id: string; display_name: string | null; avatar_url: string | null; accent: string | null }>).map((row) => ({
            userId: row.user_id,
            displayName: row.display_name ?? "Creator",
            avatarUrl: normalizeAvatarUrl(row.avatar_url ?? ""),
            accent: row.accent ?? "#a855f7",
            publicFavourites: true, // assume true if DB doesn't track it
          }))
        );
      }
    } else {
      setUserResults(
        (
          (data ?? []) as Array<{
            user_id: string;
            display_name: string | null;
            avatar_url: string | null;
            accent: string | null;
            public_favourites: boolean | null;
          }>
        ).map((row) => ({
          userId: row.user_id,
          displayName: row.display_name ?? "Creator",
          avatarUrl: normalizeAvatarUrl(row.avatar_url ?? ""),
          accent: row.accent ?? "#a855f7",
          publicFavourites: row.public_favourites ?? false,
        }))
      );
    }
    setUserSearchLoading(false);
  }, []);

  const loadPublicCollection = useCallback(async (collectionId: string) => {
    setPublicCollectionLoading(true);
    const { data: collectionRow } = await supabase
      .from("collections")
      .select("id, name, description, color, is_public")
      .eq("id", collectionId)
      .eq("is_public", true)
      .maybeSingle();

    if (!collectionRow) {
      setPublicCollection(null);
      setPublicCollectionGifs([]);
      setPublicCollectionLoading(false);
      return;
    }
    const { data: itemRows } = await supabase
      .from("collection_items")
      .select("gif_id, position")
      .eq("collection_id", collectionId)
      .order("position", { ascending: true });

    const gifIds = (itemRows ?? []).map((item) => item.gif_id as string);
    const [{ data: favouriteRows }, { data: assetRows }] = await Promise.all([
      supabase.from("favourites").select("gif_id, gif_data").in("gif_id", gifIds),
      supabase.from("gif_assets").select("gif_id, gif_data").in("gif_id", gifIds),
    ]);

    const favouriteMap = new Map<string, Gif>();
    (favouriteRows ?? []).forEach((row) => favouriteMap.set(row.gif_id, row.gif_data));
    (assetRows ?? []).forEach((row) => {
      if (!favouriteMap.has(row.gif_id)) favouriteMap.set(row.gif_id, row.gif_data);
    });

    setPublicCollection({
      id: collectionRow.id,
      name: collectionRow.name,
      description: collectionRow.description ?? "",
      color: collectionRow.color ?? "#a855f7",
      isPublic: true,
      gifIds,
    });
    setPublicCollectionGifs(gifIds.map((gifId) => favouriteMap.get(gifId)).filter(Boolean) as Gif[]);
    setPublicCollectionLoading(false);
  }, []);

  const loadPublicUser = useCallback(async (userId: string) => {
    setSelectedUserLoading(true);
    let { data: profile, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, accent, public_profile, public_favourites")
      .eq("user_id", userId)
      .maybeSingle();

    let publicFavouritesVal = false;

    if (error) {
      console.warn("Failed to fetch public user with privacy columns, retrying fallback...", error);
      const { data: fallbackProfile, error: fallbackError } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, accent")
        .eq("user_id", userId)
        .maybeSingle();

      if (fallbackError || !fallbackProfile) {
        console.error("Fallback loadPublicUser query failed:", fallbackError);
        setSelectedUserProfile(null);
        setSelectedUserCollections([]);
        setSelectedUserFavourites([]);
        setSelectedUserMetadata({});
        setSelectedUserLoading(false);
        return;
      }
      profile = fallbackProfile as any;
      publicFavouritesVal = true; // Assume true if columns are not present in DB yet
    } else {
      if (!profile) {
        setSelectedUserProfile(null);
        setSelectedUserCollections([]);
        setSelectedUserFavourites([]);
        setSelectedUserMetadata({});
        setSelectedUserLoading(false);
        return;
      }
      publicFavouritesVal = profile.public_favourites ?? false;
    }
    
    if (!profile) {
      setSelectedUserLoading(false);
      return;
    }
 
    const publicProfile: PublicUserProfile = {
      userId: profile.user_id,
      displayName: profile.display_name ?? "Creator",
      avatarUrl: normalizeAvatarUrl(profile.avatar_url ?? ""),
      accent: profile.accent ?? "#a855f7",
      publicFavourites: publicFavouritesVal,
    };
    setSelectedUserProfile(publicProfile);

    const { data: collectionsRows } = await supabase
      .from("collections")
      .select("id, name, description, color, is_public")
      .eq("user_id", userId)
      .eq("is_public", true);

    const collectionList = (collectionsRows ?? []) as any[];
    const publicIds = collectionList.map((item) => item.id);
    const { data: itemRows } =
      publicIds.length > 0
        ? await supabase
            .from("collection_items")
            .select("collection_id, gif_id, position")
            .eq("user_id", userId)
            .in("collection_id", publicIds)
            .order("position", { ascending: true })
        : { data: [] };

    const collectionMap = new Map<string, string[]>();
    (itemRows ?? []).forEach((item) => {
      const existing = collectionMap.get(item.collection_id) ?? [];
      collectionMap.set(item.collection_id, [...existing, item.gif_id]);
    });

    setSelectedUserCollections(
      collectionList.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? "",
        color: row.color ?? "#a855f7",
        isPublic: true,
        gifIds: collectionMap.get(row.id) ?? [],
      }))
    );

    // Bug A Fix: Read and populate selectedUserProfile favourites if allowed
    if (publicFavouritesVal) {
      // 1. Fetch public favourites list
      try {
        const { data: favouritesRes, error: favouritesError } = await supabase
          .from("favourites")
          .select("gif_id, gif_data")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (favouritesError) {
          console.error("Failed to load public favourites from Supabase:", favouritesError);
          setSelectedUserFavourites([]);
        } else {
          setSelectedUserFavourites((favouritesRes ?? []).map((row) => row.gif_data));
        }
      } catch (err) {
        console.error("Error executing public favourites query:", err);
        setSelectedUserFavourites([]);
      }

      // 2. Fetch public favourites metadata (tags, notes) separately and gracefully
      try {
        const { data: metadataRes, error: metadataError } = await supabase
          .from("gif_metadata")
          .select("gif_id, notes, tags, use_later, custom_source_url, search_terms, updated_at")
          .eq("user_id", userId);

        if (metadataError) {
          console.warn("Public user metadata query returned an error (expected if RLS is restricted):", metadataError);
          setSelectedUserMetadata({});
        } else {
          const metadataMap: Record<string, GifMeta> = {};
          if (metadataRes) {
            metadataRes.forEach((row) => {
              metadataMap[row.gif_id] = {
                tags: row.tags ?? [],
                notes: row.notes ?? "",
                addedAt: row.updated_at,
                useLater: row.use_later,
                imported: false,
                customSourceUrl: row.custom_source_url ?? undefined,
                collectionIds: [],
                searchTerms: row.search_terms ?? [],
              };
            });
          }
          setSelectedUserMetadata(metadataMap);
        }
      } catch (err) {
        console.warn("Exception during public user metadata query:", err);
        setSelectedUserMetadata({});
      }
    } else {
      setSelectedUserFavourites([]);
      setSelectedUserMetadata({});
    }

    setSelectedUserLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchGifs("", "", 0);
  }, [user, fetchGifs]);

  useEffect(() => {
    if (page === "users") {
      void searchUsers(userSearch);
    }
  }, [page, searchUsers, userSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!user) return;
      setOffset(0);
      fetchGifs(searchQuery, activeCategory, 0);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [searchQuery, activeCategory, user, fetchGifs, setOffset]);

  useEffect(() => {
    const handleHashChange = () => {
      const nextRoute = parseHashRoute();
      if (nextRoute.type === "public-collection") {
        void loadPublicCollection(nextRoute.id);
        return;
      }
      if (nextRoute.type === "public-user") {
        void loadPublicUser(nextRoute.id);
        return;
      }
      if (nextRoute.type === "page") {
        setPage(nextRoute.id as Page);
      }
      setPublicCollection(null);
      setPublicCollectionGifs([]);
      setSelectedUserProfile(null);
      setSelectedUserCollections([]);
      setSelectedUserFavourites([]);
      setSelectedUserMetadata({});
    };
    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [loadPublicCollection, loadPublicUser]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!syncPanelRef.current) return;
      if (!syncPanelRef.current.contains(event.target as Node)) setShowSyncDetails(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const isAuthCallback = hash.includes("access_token=") || 
                           hash.includes("error=") ||
                           hash.includes("refresh_token=");

    if (hash.includes("error=")) {
      // Parse query params from the hash string (replacing # with ?)
      const params = new URLSearchParams(hash.replace(/^#/, "?"));
      const errorTitle = params.get("error") || "Auth Error";
      const errorDesc = params.get("error_description") || "OAuth Redirect Failure";
      localStorage.setItem("gif_studio_google_login_error", `${errorTitle}: ${errorDesc}`);
      // Clean URL hash
      window.location.hash = "#/discover";
      return;
    }

    if (isAuthCallback && user) {
      // Clean up the URL hash after successful login
      window.location.hash = `#/${workspace.profile.landingPage || "discover"}`;
      setPage(workspace.profile.landingPage || "discover");
      initialLandingAppliedRef.current = true;
      return;
    }

    if (
      workspace.profile.landingPage &&
      !initialLandingAppliedRef.current &&
      route.type !== "public-collection" &&
      route.type !== "public-user" &&
      !isAuthCallback
    ) {
      setPage(workspace.profile.landingPage);
      window.location.hash = `#/${workspace.profile.landingPage}`;
      initialLandingAppliedRef.current = true;
    }
  }, [workspace.profile.landingPage, route.type, user, hash]);

  const gifMap = useMemo(
    () =>
      Object.fromEntries(
        [...favourites, ...workspace.manualImports].map((gif) => [gif.id, gif])
      ),
    [favourites, workspace.manualImports]
  );
  const allTags = useMemo(
    () => Array.from(new Set(Object.values(workspace.gifMeta).flatMap((meta) => meta.tags))).sort(),
    [workspace.gifMeta]
  );
  const allUsernames = useMemo(
    () => Array.from(new Set(favourites.map((gif) => gif.username).filter(Boolean))).sort(),
    [favourites]
  );

  const topTags = useMemo(() => {
    const counts: Record<string, number> = {};
    favourites.forEach((gif) => {
      const meta = workspace.gifMeta[gif.id];
      if (meta && meta.tags) {
        meta.tags.forEach((tag) => {
          const clicks = workspace.clickCounts[gif.id] || 1;
          counts[tag] = (counts[tag] || 0) + clicks;
        });
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
  }, [favourites, workspace.gifMeta, workspace.clickCounts]);

  const topCreators = useMemo(() => {
    const counts: Record<string, number> = {};
    favourites.forEach((gif) => {
      if (gif.username) {
        const clicks = workspace.clickCounts[gif.id] || 1;
        counts[gif.username] = (counts[gif.username] || 0) + clicks;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([username]) => username);
  }, [favourites, workspace.clickCounts]);

  const filteredFavourites = useMemo(() => {
    const selectedCollectionId = filterCollectionId === "all" ? null : filterCollectionId;
    const ids = selectedCollectionId
      ? workspace.collections.find((collection) => collection.id === selectedCollectionId)?.gifIds ?? []
      : null;
    
    const filtered = favourites.filter((gif) => {
      const meta = workspace.gifMeta[gif.id];
      const haystack = `${gif.title} ${gif.username} ${meta?.notes ?? ""} ${(meta?.tags ?? []).join(" ")}`.toLowerCase();
      if (favouriteSearch && !haystack.includes(favouriteSearch.toLowerCase())) return false;
      if (filterTag !== "all" && !(meta?.tags ?? []).includes(filterTag)) return false;
      if (filterRating !== "all" && gif.rating !== filterRating) return false;
      if (filterUsername !== "all" && gif.username !== filterUsername) return false;
      if (ids && !ids.includes(gif.id)) return false;
      return true;
    });

    if (sortOption === "date-added-asc") {
      filtered.sort((a, b) => {
        const timeA = new Date(workspace.gifMeta[a.id]?.addedAt || 0).getTime();
        const timeB = new Date(workspace.gifMeta[b.id]?.addedAt || 0).getTime();
        return timeA - timeB;
      });
    } else if (sortOption === "date-added-desc") {
      filtered.sort((a, b) => {
        const timeA = new Date(workspace.gifMeta[a.id]?.addedAt || 0).getTime();
        const timeB = new Date(workspace.gifMeta[b.id]?.addedAt || 0).getTime();
        return timeB - timeA;
      });
    } else if (sortOption === "most-used") {
      filtered.sort((a, b) => {
        const clicksA = workspace.clickCounts[a.id] || 0;
        const clicksB = workspace.clickCounts[b.id] || 0;
        if (clicksA !== clicksB) return clicksB - clicksA;
        const timeA = new Date(workspace.gifMeta[a.id]?.addedAt || 0).getTime();
        const timeB = new Date(workspace.gifMeta[b.id]?.addedAt || 0).getTime();
        return timeB - timeA;
      });
    } else if (sortOption === "alphabetical") {
      filtered.sort((a, b) => {
        const titleA = (a.title || "").toLowerCase();
        const titleB = (b.title || "").toLowerCase();
        return titleA.localeCompare(titleB);
      });
    } else if (sortOption === "smart-recommendations") {
      const getScore = (gif: Gif) => {
        let score = 0;
        const clicks = workspace.clickCounts[gif.id] || 0;
        score += clicks * 2;
        
        const meta = workspace.gifMeta[gif.id];
        if (meta && meta.tags) {
          meta.tags.forEach((tag) => {
            if (topTags.includes(tag)) {
              score += 3;
            }
          });
        }
        if (gif.username && topCreators.includes(gif.username)) {
          score += 5;
        }
        return score;
      };
      
      filtered.sort((a, b) => {
        const scoreA = getScore(a);
        const scoreB = getScore(b);
        if (scoreA !== scoreB) return scoreB - scoreA;
        const timeA = new Date(workspace.gifMeta[a.id]?.addedAt || 0).getTime();
        const timeB = new Date(workspace.gifMeta[b.id]?.addedAt || 0).getTime();
        return timeB - timeA;
      });
    } else if (sortOption === "shuffle") {
      const seed = shuffleSeed;
      const getRand = (str: string) => {
        let hash = 0;
        const combined = str + seed.toString();
        for (let i = 0; i < combined.length; i++) {
          hash = combined.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash % 1000) / 1000;
      };
      filtered.sort((a, b) => getRand(a.id) - getRand(b.id));
    }

    return filtered;
  }, [
    favourites,
    workspace,
    favouriteSearch,
    filterTag,
    filterRating,
    filterUsername,
    filterCollectionId,
    sortOption,
    shuffleSeed,
    topTags,
    topCreators,
  ]);

  const queuedGifs = useMemo(
    () => favourites.filter((gif) => workspace.gifMeta[gif.id]?.useLater),
    [favourites, workspace.gifMeta]
  );

  const recentHistory = useMemo(() => {
    const seen = new Set<string>();
    const uniqueGifs: Gif[] = [];
    for (const entry of workspace.history) {
      const gif = gifMap[entry.gifId];
      if (gif && !seen.has(gif.id)) {
        seen.add(gif.id);
        uniqueGifs.push(gif);
      }
    }
    return uniqueGifs.slice(0, 12);
  }, [workspace.history, gifMap]);

  const publicCollections = useMemo(
    () => workspace.collections.filter((collection) => collection.isPublic),
    [workspace.collections]
  );

  const analytics = useMemo(
    () => ({
      totalSaved: favourites.length,
      queued: queuedGifs.length,
      importedCount: Object.values(workspace.gifMeta).filter((meta) => meta.imported).length,
      topTag: allTags[0] ?? "none",
    }),
    [favourites.length, queuedGifs.length, workspace.gifMeta, allTags]
  );

  const handleCopy = (text: string, label = "Copied") =>
    navigator.clipboard
      .writeText(text)
      .then(() => showToast(`${label} copied to clipboard!`, "success"))
      .catch(() => showToast("Failed to copy", "error"));

  const isFavourited = (id: string) => favourites.some((gif) => gif.id === id);
  const isQueued = (id: string) => workspace.gifMeta[id]?.useLater ?? false;

  const currentLabel = searchQuery
    ? `Results for "${searchQuery}"`
    : activeCategory
    ? CATEGORIES.find((category) => category.value === activeCategory)?.label || "GIFs"
    : "🔥 Trending Now";

  const currentSearchTerm = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (trimmed) return trimmed;
    if (activeCategory) {
      const categoryLabel = CATEGORIES.find((category) => category.value === activeCategory)?.label;
      return categoryLabel?.replace(/^[^\w]+/, "").trim() || activeCategory;
    }
    return "Trending";
  }, [searchQuery, activeCategory]);

  const handleToggleFavouriteFromDiscover = (gif: Gif) => {
    void handleToggleFavourite(gif, currentSearchTerm);
  };

  const handleSelectGif = useCallback(
    (gif: Gif) => {
      setSelectedGif(gif);
      void addHistory(gif);
    },
    [addHistory]
  );

  const handleLogout = async () => {
    await signOut();
    setSelectedGif(null);
    setPublicCollection(null);
    setPublicCollectionGifs([]);
    showToast("Signed out successfully", "info");
  };

  const aiSuggestions = useMemo(
    () =>
      searchQuery.trim()
        ? [
            `${searchQuery.toLowerCase()} reaction gif`,
            `${searchQuery.toLowerCase()} meme response`,
            `${searchQuery.toLowerCase()} dramatic reaction`,
          ]
        : [],
    [searchQuery]
  );

  const navigateToPage = (nextPage: Page) => {
    setPage(nextPage);
    window.location.hash = `#/${nextPage}`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-zinc-400">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading your session...</p>
        </div>
      </div>
    );
  }

  if (route.type === "public-collection") {
    return (
      <PublicCollectionPage
        publicCollection={publicCollection}
        publicCollectionLoading={publicCollectionLoading}
        publicCollectionGifs={publicCollectionGifs}
        toast={toast}
      />
    );
  }

  if (route.type === "public-user") {
    return (
      <PublicUserProfilePage
        selectedUserProfile={selectedUserProfile}
        selectedUserCollections={selectedUserCollections}
        selectedUserFavourites={selectedUserFavourites}
        selectedUserMetadata={selectedUserMetadata}
        selectedUserLoading={selectedUserLoading}
        isFavourited={isFavourited}
        handleToggleFavourite={handleToggleFavourite}
        isQueued={isQueued}
        handleQueueToggle={handleQueueToggle}
        setSelectedGif={setSelectedGif}
        toast={toast}
      />
    );
  }

  if (!user) return <AuthPage />;

  return (
    <div className="min-h-screen bg-zinc-950 text-white" style={{ ["--accent" as string]: workspace.profile.accent }}>
      <Header
        user={user}
        workspace={workspace}
        page={page}
        navigateToPage={navigateToPage}
        handleLogout={handleLogout}
        syncStatus={syncStatus}
        favouritesOffline={favouritesOffline}
        workspaceOffline={workspaceOffline}
        lastSyncAt={lastSyncAt}
        retryingSync={retryingSync}
        retrySync={retrySync}
        showSyncDetails={showSyncDetails}
        setShowSyncDetails={setShowSyncDetails}
        syncPanelRef={syncPanelRef}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {page === "discover" && (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center mb-6">
            <div className="flex items-center gap-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl px-4 py-3 search-glow flex-1">
              <span className="text-[var(--text-muted)] flex-shrink-0">
                <SearchIcon />
              </span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search millions of GIFs or describe a reaction..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-[var(--text-faint)] text-sm font-medium outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    inputRef.current?.focus();
                  }}
                  className="text-[var(--text-muted)] hover:text-white transition-colors flex-shrink-0 hover:bg-white/10 p-1 rounded-full"
                >
                  <XIcon />
                </button>
              )}
              {loading && (
                <div
                  className="w-4 h-4 border-2 rounded-full animate-spin flex-shrink-0"
                  style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                />
              )}
            </div>
            <select
              value={moodFilter}
              onChange={(e) => setMoodFilter(e.target.value as MoodFilter)}
              className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl px-4 py-3 text-sm text-white outline-none min-w-48 focus:border-[var(--accent)] transition-colors"
            >
              {MOOD_PRESETS.map((mood) => (
                <option key={mood.value} value={mood.value}>
                  {mood.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {page === "discover" && aiSuggestions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto mb-3 pb-1 no-scrollbar">
            {aiSuggestions.map((suggestion) => (
              <button key={suggestion} onClick={() => setSearchQuery(suggestion)} className="chip">
                Try: {suggestion}
              </button>
            ))}
          </div>
        )}
        {page === "discover" && (
          <div className="flex gap-2 overflow-x-auto mb-6 pb-1 no-scrollbar">
            {CATEGORIES.map((category) => (
              <button
                key={category.value || "trending"}
                onClick={() => {
                  setActiveCategory(category.value);
                  setSearchQuery("");
                  setOffset(0);
                }}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 hover:scale-105 ${
                  activeCategory === category.value && !searchQuery
                    ? "pill-active"
                    : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white border border-[var(--border)] hover:border-[var(--border-strong)]"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        )}

        {(workspaceLoading || favouritesLoading) && (
          <MasonryGrid
            items={Array.from({ length: 8 })}
            renderItem={(_, index) => (
              <SkeletonCard key={index} height={[160, 200, 140, 220, 180][index % 5]} />
            )}
          />
        )}
        {!workspaceLoading && page === "discover" && (
          <DiscoverPage
            currentLabel={currentLabel}
            analytics={analytics}
            loading={loading}
            gifs={gifs}
            hasMore={hasMore}
            loadingMore={loadingMore}
            fetchGifs={fetchGifs}
            searchQuery={searchQuery}
            activeCategory={activeCategory}
            offset={offset}
            addHistory={handleSelectGif}
            isFavourited={isFavourited}
            handleToggleFavourite={handleToggleFavouriteFromDiscover}
            workspace={workspace}
            isQueued={isQueued}
            handleQueueToggle={handleQueueToggle}
            recentHistory={recentHistory}
            manualImportTitle={manualImportTitle}
            setManualImportTitle={setManualImportTitle}
            manualImportUrl={manualImportUrl}
            setManualImportUrl={setManualImportUrl}
            importExternalGif={() => importExternalGif(manualImportTitle, manualImportUrl)}
          />
        )}
        {!workspaceLoading && page === "favourites" && (
          <FavouritesPage
            favouriteSearch={favouriteSearch}
            setFavouriteSearch={setFavouriteSearch}
            filterCollectionId={filterCollectionId}
            setFilterCollectionId={setFilterCollectionId}
            filterTag={filterTag}
            setFilterTag={setFilterTag}
            filterRating={filterRating}
            setFilterRating={setFilterRating}
            filterUsername={filterUsername}
            setFilterUsername={setFilterUsername}
            sortOption={sortOption}
            setSortOption={setSortOption}
            onReshuffle={() => setShuffleSeed((s) => s + 1)}
            workspace={workspace}
            allTags={allTags}
            allUsernames={allUsernames}
            filteredFavourites={filteredFavourites}
            queuedGifs={queuedGifs}
            handleClearAll={handleClearAll}
            onOpenGif={setSelectedGif}
            handleToggleFavourite={handleToggleFavourite}
            isQueued={isQueued}
            handleQueueToggle={handleQueueToggle}
            newCollectionName={newCollectionName}
            setNewCollectionName={setNewCollectionName}
            newCollectionDescription={newCollectionDescription}
            setNewCollectionDescription={setNewCollectionDescription}
            newCollectionPublic={newCollectionPublic}
            setNewCollectionPublic={setNewCollectionPublic}
            addCollection={addCollection}
            updateCollectionVisibility={updateCollectionVisibility}
            reorderQueue={reorderQueue}
            handleCopy={handleCopy}
          />
        )}
        {!workspaceLoading && page === "toolbox" && (
          <ToolboxPage
            publicCollections={publicCollections}
            workspace={workspace}
            analytics={analytics}
            updateProfileField={updateProfileField}
            setPage={navigateToPage}
            handleCopy={handleCopy}
          />
        )}
        {!workspaceLoading && page === "users" && (
          <UsersPage
            userSearch={userSearch}
            setUserSearch={setUserSearch}
            userSearchLoading={userSearchLoading}
            searchUsers={searchUsers}
            userResults={userResults}
            selectedUserProfile={selectedUserProfile}
            selectedUserCollections={selectedUserCollections}
            selectedUserFavourites={selectedUserFavourites}
            selectedUserMetadata={selectedUserMetadata}
            selectedUserLoading={selectedUserLoading}
            loadPublicUser={loadPublicUser}
            isFavourited={isFavourited}
            onToggleFavourite={handleToggleFavourite}
            isQueued={isQueued}
            onQueueToggle={handleQueueToggle}
            onSelectGif={setSelectedGif}
          />
        )}
        {!workspaceLoading && page === "profile" && (
          <ProfilePage
            workspace={workspace}
            updateProfileField={updateProfileField}
            user={user}
            gifMap={gifMap}
            giphyUsage={giphyUsage}
          />
        )}
      </main>

      <Footer />

      {selectedGif && (
        <GifModal
          gif={selectedGif}
          onClose={() => setSelectedGif(null)}
          onCopy={handleCopy}
          isFavourited={isFavourited(selectedGif.id)}
          onToggleFavourite={(gif) => {
            void handleToggleFavourite(gif, page === "discover" ? currentSearchTerm : undefined);
          }}
          note={workspace.gifMeta[selectedGif.id]?.notes ?? ""}
          tags={workspace.gifMeta[selectedGif.id]?.tags ?? []}
          searchTerms={workspace.gifMeta[selectedGif.id]?.searchTerms ?? []}
          onUpdateNote={(gif, note) => {
            void updateMeta(gif, (meta) => ({ ...meta, notes: note }));
          }}
          onAddTag={(gif, tag) => {
            void updateMeta(gif, (meta) => ({
              ...meta,
              tags: Array.from(new Set([...meta.tags, tag.trim().toLowerCase()])),
            }));
          }}
          onRemoveSearchTerm={(gif, term) => {
            void updateMeta(gif, (meta) => ({
              ...meta,
              searchTerms: (meta.searchTerms ?? []).filter((value) => value !== term),
            }));
          }}
          collections={workspace.collections}
          onAddGifToCollection={addGifToCollection}
          onRemoveGifFromCollection={removeGifFromCollection}
        />
      )}
      <Toast {...toast} />
    </div>
  );
}
