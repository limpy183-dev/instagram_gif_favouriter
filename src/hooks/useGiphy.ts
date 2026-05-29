import { useCallback, useState, useRef } from "react";
import type { Gif, GiphyUsage } from "../types";

const GIPHY_KEYS = [
  import.meta.env.VITE_GIPHY_API_KEY_1 as string | undefined,
  import.meta.env.VITE_GIPHY_API_KEY_2 as string | undefined,
  import.meta.env.VITE_GIPHY_API_KEY_3 as string | undefined,
  import.meta.env.VITE_GIPHY_API_KEY_4 as string | undefined,
  import.meta.env.VITE_GIPHY_API_KEY_5 as string | undefined,
  import.meta.env.VITE_GIPHY_API_KEY as string | undefined,
].filter((key): key is string => Boolean(key));
// Log to console so developer can verify that keys are being injected from secrets in production
console.log("Loaded GIPHY_KEYS:", GIPHY_KEYS);

const LIMIT = 24;
const GIPHY_USAGE_KEY = "gif_studio_giphy_usage";

function getCurrentHourKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`;
}

function readGiphyUsage(): GiphyUsage {
  try {
    const stored = localStorage.getItem(GIPHY_USAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as Partial<GiphyUsage>) : null;
    const hourKey = getCurrentHourKey();
    if (!parsed || parsed.hourKey !== hourKey) {
      return { hourKey, count: 0, lastStatus: null, lastError: "" };
    }
    return {
      hourKey,
      count: parsed.count ?? 0,
      lastStatus: parsed.lastStatus ?? null,
      lastError: parsed.lastError ?? "",
    };
  } catch {
    return { hourKey: getCurrentHourKey(), count: 0, lastStatus: null, lastError: "" };
  }
}

function writeGiphyUsage(usage: GiphyUsage) {
  localStorage.setItem(GIPHY_USAGE_KEY, JSON.stringify(usage));
}

async function fetchGifData(endpointFactory: (apiKey: string) => string) {
  let lastError: unknown = null;

  for (const apiKey of GIPHY_KEYS) {
    try {
      const response = await fetch(endpointFactory(apiKey));
      if (response.ok) return { response, apiKey } as const;
      if (![429, 403, 400, 401].includes(response.status)) return { response, apiKey } as const;
      lastError = new Error(`Giphy responded with ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("All Giphy keys failed");
}

export function useGiphy(
  moodFilter: string,
  showToast: (msg: string, type?: "success" | "error" | "info" | "heart") => void
) {
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [giphyUsage, setGiphyUsage] = useState<GiphyUsage>(readGiphyUsage());

  // Search caching mechanism to avoid duplicate network fetches
  const cacheRef = useRef<Record<string, { gifs: Gif[]; hasMore: boolean; nextOffset: number }>>({});

  const fetchGifs = useCallback(
    async (query: string, cat: string, newOffset = 0, bypassCache = false) => {
      const moodKeywords =
        moodFilter !== "all"
          ? moodFilter === "savage"
            ? "eye roll sassy mic drop"
            : moodFilter === "wholesome"
            ? "hug love cute"
            : moodFilter === "awkward"
            ? "cringe nervous side eye"
            : moodFilter === "excited"
            ? "party celebrate hyped"
            : moodFilter === "chaotic"
            ? "wild panic mess"
            : moodFilter === "flirty"
            ? "wink kiss romance"
            : ""
          : "";

      const searchTerm = [query || cat, moodKeywords].filter(Boolean).join(" ").trim();
      const cacheKey = `${searchTerm}_${newOffset}`;

      // Retrieve from cache if page 0 is fetched and cache is valid
      if (!bypassCache && newOffset === 0 && cacheRef.current[cacheKey]) {
        const cached = cacheRef.current[cacheKey];
        setGifs(cached.gifs);
        setHasMore(cached.hasMore);
        setOffset(cached.nextOffset);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      if (newOffset === 0) setLoading(true);
      else setLoadingMore(true);

      try {
        const { response, apiKey } = await fetchGifData((apiKey) =>
          searchTerm
            ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(
                searchTerm
              )}&limit=${LIMIT}&offset=${newOffset}`
            : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=${LIMIT}&offset=${newOffset}`
        );

        if (!response.ok) {
          const failedUsage = {
            ...readGiphyUsage(),
            lastStatus: response.status,
            lastError: `Giphy request failed with status ${response.status}`,
          };
          writeGiphyUsage(failedUsage);
          setGiphyUsage(failedUsage);
          showToast(
            response.status === 429
              ? "Giphy rate limit reached. Switched key if possible."
              : `Failed to fetch GIFs (${response.status}). Try again.`,
            "error"
          );
          if (newOffset === 0) setGifs([]);
          setHasMore(false);
          return;
        }

        const currentUsage = readGiphyUsage();
        const nextUsage: GiphyUsage = {
          hourKey: currentUsage.hourKey,
          count: currentUsage.count + 1,
          lastStatus: response.status,
          lastError: "",
        };
        writeGiphyUsage(nextUsage);
        setGiphyUsage(nextUsage);

        const json = await response.json();
        if (apiKey !== GIPHY_KEYS[0]) showToast("Switched to a fallback Giphy key.", "info");
        const data: Gif[] = json.data || [];

        setGifs((prev) => {
          const nextGifs = newOffset === 0 ? data : [...prev, ...data];

          // Save search to cache for first page results
          if (newOffset === 0) {
            cacheRef.current[cacheKey] = {
              gifs: nextGifs,
              hasMore: data.length === LIMIT,
              nextOffset: newOffset + LIMIT,
            };
          }
          return nextGifs;
        });

        setHasMore(data.length === LIMIT);
        setOffset(newOffset + LIMIT);
      } catch (error) {
        console.error("Giphy fetch error in hook:", error);
        const currentUsage = readGiphyUsage();
        const failedUsage = {
          ...currentUsage,
          lastError: error instanceof Error ? error.message : "Unknown Giphy request error",
        };
        writeGiphyUsage(failedUsage);
        setGiphyUsage(failedUsage);
        showToast("Failed to fetch GIFs. Try again.", "error");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [moodFilter, showToast]
  );

  const clearCache = useCallback(() => {
    cacheRef.current = {};
  }, []);

  return {
    gifs,
    loading,
    loadingMore,
    hasMore,
    offset,
    giphyUsage,
    fetchGifs,
    clearCache,
    setGifs,
    setOffset,
  };
}
