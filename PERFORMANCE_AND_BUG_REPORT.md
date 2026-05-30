# GIF Studio — Code Audit, Bug Report & Performance Plan

**Branch:** `overhaul-ui` · **Stack:** React 19 + Vite 7 + Tailwind 4 + Supabase, deployed to GitHub Pages
**Scope:** Full `src/` review (~4,200 LOC), build output, CI, and config.

---

## TL;DR — Why the site feels slow

The slow load is **not one thing**; it's a stack of compounding issues. In rough order of impact:

1. **The Discover feed is hidden until the Supabase workspace finishes loading** — even though it doesn't need it. A slow DB query blocks GIFs that are already fetched.
2. **Every image is a full animated GIF, loaded eagerly, with no lazy-loading and no list virtualization.** With a large favourites library this means dozens-to-hundreds of animated GIFs decoding at once.
3. **Every login refetches *all* favourites, *all* cached GIF assets, and the *entire* `view_history` table** with no limit. These payloads grow forever and gate first render.
4. **`view_history` gains a row on every GIF view and is never pruned**, so the login query gets slower the more the app is used.
5. A monolithic **486 KB (136 KB gzipped) JS bundle** with no code-splitting and `console.*` left in.

Fixing #1 and #2 alone should produce the biggest perceived improvement.

---

## Severity legend
🔴 High (correctness or major perf) · 🟠 Medium · 🟡 Low / hygiene

---

## 1. Performance findings

### 🔴 P1 — Discover (and every page) is gated behind the workspace load
`src/App.tsx:901, 927, 964, 974, 994`

```tsx
{!workspaceLoading && page === "discover" && ( <DiscoverPage .../> )}
```

The Discover GIF grid comes from Giphy and does **not** depend on the Supabase workspace, yet it's wrapped in `!workspaceLoading`. While `loadWorkspace()` runs its 6 parallel queries (including the heavy `gif_assets` / `view_history` fetches), the user stares at skeleton cards even though the trending GIFs may already be back.

**Fix:** Render Discover as soon as `useGiphy` has data; only gate the *favourites-derived* UI (Favourites, Toolbox, Profile metadata) on `workspaceLoading`. Decouple "GIFs loading" (`loading`) from "workspace loading."

---

### 🔴 P2 — Animated GIFs as thumbnails, no lazy-loading, no virtualization
`src/components/GifCard.tsx:34`, `src/pages/DiscoverPage.tsx:88`, `src/pages/FavouritesPage.tsx:168`, `src/components/users/PublicProfileView.tsx:271`

```tsx
<img src={gif.images.fixed_height.url} ... />   // full animated GIF, no loading="lazy"
```

- **No `loading="lazy"` or `decoding="async"`** anywhere (confirmed: grep found 0 usages). All images in the grid download immediately.
- **`fixed_height.url` is the full animated GIF.** Giphy also returns `fixed_height_still` (static JPG) and `fixed_height.webp` (far smaller). The app never uses the still/WebP variants.
- **No list virtualization.** Favourites and public-profile pages render *every* GIF at once. 200 favourites = 200 simultaneously-decoding animated GIFs.

**Fix (highest ROI):**
- Add `loading="lazy"` + `decoding="async"` to grid `<img>`s.
- Use the still frame (`fixed_height_still`) for the grid and swap to the animated/WebP version on hover or in the modal. Extend the `Gif` type (`src/types.ts:12`) to carry the still/webp URLs.
- Virtualize long lists (e.g. `@tanstack/react-virtual`) so off-screen cards aren't mounted.

---

### 🔴 P3 — Unbounded data fetched on every login
`src/hooks/useWorkspace.ts:200-218` and `:339-350`

`loadWorkspace()` fetches, with no `limit`:
- all `collection_items`, all `gif_metadata`, **all `view_history`**, and **all `gif_assets` (full `gif_data` JSON blob per row)**.

`loadFavourites()` fetches **all `favourites`**, each row containing the entire Giphy object in `gif_data`.

Both block the first meaningful render. Payload scales linearly with library size and never plateaus.

**Fix:** Paginate favourites (load first ~30, lazy-load the rest). Only fetch `gif_assets` for manual imports (`.eq("user_id", …).eq(... )` filtered, or a dedicated `is_import` column) instead of pulling every cached asset. Select only needed columns.

---

### 🔴 P4 — `view_history` grows forever and is fully re-read each load
`src/hooks/useWorkspace.ts:146-152` (write) and `:212-216` (read)

```ts
await supabase.from("view_history").insert({ user_id, gif_id });   // every view, no upsert, no cap
...
.from("view_history").select("gif_id, viewed_at").eq("user_id", user.id)  // no .limit()
```

Every GIF view inserts a new row (no dedup/upsert). On load the app fetches the **entire** history to compute `clickCounts`, then throws away all but the last 30 for display. Over time this query degrades load time permanently.

**Fix:** Either store an aggregated `click_count` per gif (upsert + increment), or cap history (`.limit(500)`), and prune old rows server-side (trigger or scheduled function).

---

### 🟠 P5 — Monolithic bundle, no code-splitting, `console.*` shipped
`vite.config.ts`, build output

- One chunk: **`main-*.js` = 486 KB raw / 136 KB gzip** (CSS 46 KB / 9 KB). No `manualChunks`, no lazy routes.
- The 6-entry multi-page Vite config (`index.html`, `discover.html`, …) is misleading: every HTML loads the same `/src/main.tsx` and renders the same `<App>` with hash routing, so they all share the one bundle — the separate entries provide **no** code-splitting benefit.
- 16 `console.log/warn/error` statements ship to production (no `esbuild.drop`).

**Fix:** `React.lazy` the page components (`DiscoverPage`, `FavouritesPage`, `ToolboxPage`, `ProfilePage`, `UsersPage`, public pages) and Suspense-split. Add `build: { rollupOptions: { output: { manualChunks: { supabase: ['@supabase/supabase-js'], react: ['react','react-dom'] } } } }`. Add `esbuild: { drop: ['console','debugger'] }`.

---

### 🟠 P6 — Google Fonts loads 9 weights, render-affecting
`index.html:8` (and all 6 HTML files)

```html
href="...Inter:wght@300;400;500;600;700;800;900&display=swap"
```

Nine weights is a large external CSS + font payload on a render-affecting `<link>`. The app realistically uses ~3 (400/600/800).

**Fix:** Request only the weights actually used, or self-host Inter via `@fontsource/inter` so it's bundled/cached with the app and not a third-party round-trip. Add `font-display: swap` is already present — good.

---

### 🟠 P7 — Entire workspace serialized to `localStorage` on every state change
`src/hooks/useWorkspace.ts:762-766`

```ts
useEffect(() => {
  if (workspace.profile.offlineCache)
    localStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(workspace));
}, [workspace]);
```

`workspace` changes on every favourite toggle, queue toggle, history add, and **every keystroke** in notes/tags. Each change does a synchronous `JSON.stringify` of the full workspace (all `gifMeta`) on the main thread → jank that worsens with library size.

**Fix:** Debounce the cache write (e.g. 500 ms–1 s) and/or only persist the slices that changed.

---

### 🟠 P8 — Per-keystroke DB writes and un-debounced user search
- **Notes:** `src/App.tsx:1019-1021` → `updateMeta` → `saveGifMeta` (`useWorkspace.ts:116`). Every character typed in the modal's Notes box is a Supabase upsert.
- **User search:** `src/App.tsx:427-431` re-runs `searchUsers(userSearch)` on every `userSearch` change with **no debounce** — one `profiles` query per keystroke. (Contrast the GIF search at `App.tsx:433-440`, which *is* debounced 450 ms.)

**Fix:** Debounce note persistence (save on blur or after ~700 ms idle). Debounce `searchUsers` the same way the GIF search is, or only query on the explicit "Search" button (`UserSearchSection.tsx:31`).

---

### 🟠 P9 — No component memoization; `filteredFavourites` over-recomputes
`src/App.tsx:561-659`, and 0 `React.memo` in the codebase (confirmed by grep)

`filteredFavourites`'s dependency array includes the **whole `workspace` object** (`App.tsx:649`). Viewing any GIF updates `workspace.history`/`clickCounts`, which invalidates the memo and re-filters + re-sorts the entire favourites list — even while on the Discover page. `GifCard` is also un-memoized, so a parent state change re-renders every card.

**Fix:** Narrow the deps to the slices used (`workspace.gifMeta`, `workspace.collections`, `workspace.clickCounts`). Wrap `GifCard` in `React.memo` and pass stable callbacks (`isFavourited`/`isQueued`/handlers via `useCallback`).

---

## 2. Correctness bugs

### 🔴 B1 — Changing the mood filter wipes the active search and double-fetches
`src/App.tsx:423-425`

```tsx
useEffect(() => { if (user) fetchGifs("", "", 0); }, [user, fetchGifs]);
```

`fetchGifs` is recreated whenever `moodFilter` changes (`useGiphy.ts:77-187`, dep `[moodFilter, showToast]`). So changing the mood re-runs this effect with **hard-coded empty query/category**, discarding whatever the user searched and resetting to trending+mood. Then the debounced effect (`App.tsx:433-440`) *also* fires with the real `searchQuery`/`activeCategory`. Net result: a content flash + a redundant Giphy request (burning the rate-limited keys).

**Fix:** This effect is meant to be "initial load." Gate it with a `useRef` "has-loaded" flag, or remove it and let the debounced search effect own the first fetch.

---

### 🟠 B2 — "Recently Viewed" can't display non-favourited GIFs
`src/App.tsx:666-677` (uses `gifMap`) + `:514-520` (`gifMap` = favourites + manualImports only)

`addHistory` records a view for *any* GIF (incl. trending GIFs you only previewed), but `recentHistory` resolves entries through `gifMap`, which only contains favourites and manual imports. So viewing a trending GIF writes a history row that can never be rendered in "Recently Viewed" — the panel silently drops it.

**Fix:** Persist the GIF object for viewed items (or read from the current `gifs` list too), or store viewed GIF data alongside the history row so it can be rendered without being a favourite.

---

### 🟠 B3 — Privacy fallback defaults to *public*, risking a favourites leak
`src/App.tsx:200-204` (`searchUsers` fallback) and `:300, :310` (`loadPublicUser` fallback)

When the privacy columns are absent **or the query errors for any reason**, the code assumes `publicFavourites: true`:

```ts
publicFavourites: true, // assume true if DB doesn't track it
```

A transient RLS/permission error (not just "column missing") therefore flips a private user to public and can expose favourites the user opted out of sharing.

**Fix:** Fail **closed** — default `publicFavourites: false` on error. Only treat "column does not exist" specifically (inspect the Postgres error code) as the migration-not-applied case, and even then prefer private.

---

### 🟠 B4 — Stale-closure writes in queue/collection handlers
`src/hooks/useWorkspace.ts:518-561` (`handleQueueToggle`), `:588-631` (`addGifToCollection`), `:633-668` (`removeGifFromCollection`)

These do an optimistic `setWorkspace(current => …)` (correct), but then build the **Supabase save payload from the closure-captured `workspace`** rather than the freshly computed next state:

```ts
await saveGifMeta(gif.id, { ...(workspace.gifMeta[gif.id] ?? {...}), useLater: !wasQueued });
```

If two updates land in the same render cycle, the persisted value can be stale (the DB write uses an older `workspace`). `handleToggleFavourite` avoids this by capturing `nextMetaForSync` — the others should do the same.

**Fix:** Compute the next meta/collection once, use it for *both* the state update and the DB write (as `handleToggleFavourite` already does).

---

### 🟠 B5 — Routing has three sources of truth and overlapping listeners
`src/App.tsx:143-148` (manual `hash` state) + `:442-466` (`handleHashChange` effect) + `:477-512` (landing-page effect) + `src/hooks/useHashRoute.ts` + `src/main.tsx:7-10`

There are two independent `hashchange` listeners plus a manual `hash` state plus `page` state plus `route`. The landing-page effect writes `window.location.hash`, which re-triggers the other listener; `setPage` and hash can momentarily disagree. It mostly works but is fragile and a likely source of "flashes the wrong page on load" bugs.

**Fix:** Consolidate to a single routing source (one `hashchange` listener → one `route` → derive `page`). Remove the duplicate `hash` state or the duplicate effect.

---

### 🟡 B6 — Double trending fetch on first load
`src/App.tsx:423-425` and `:433-440` both fire on mount → two `fetchGifs("", "", 0)` calls. The second hits the in-memory cache (`useGiphy.ts:100-108`) so it's not a network double-hit, but it's avoidable churn. (Same root cause as B1.)

### 🟡 B7 — `addCollection` accepts empty names
`src/hooks/useWorkspace.ts:563-575` + `CollectionsPanel.tsx:52-56`. Clicking "Create collection" with blank fields creates a nameless empty collection and persists it. Add a guard (`if (!name.trim()) return;`).

---

## 3. Security & hygiene

### 🔴 S1 — Giphy API keys logged to the console and exposed globally
`src/hooks/useGiphy.ts:13`

```ts
console.log("Loaded GIPHY_KEYS:", GIPHY_KEYS);  // ships to production
```

Confirmed present in the built `dist/assets/main-*.js`. Anyone opening DevTools sees every Giphy key. (The keys are also inlined in the bundle — inherent to client-side Giphy calls — but logging them makes abuse trivial and likely explains the existing rate-limit/key-rotation machinery.) Also `src/utils/supabase.ts:21-23` attaches `window.supabase`, exposing the client globally.

**Fix:** Delete the `console.log`. Remove the `window.supabase` global (or guard behind a dev-only flag). For real protection, proxy Giphy through a tiny serverless function so keys never reach the client. The Supabase **anon** key is designed to be public *provided RLS is enforced* — verify RLS policies exist on every table (`favourites`, `gif_metadata`, `collections`, `collection_items`, `view_history`, `gif_assets`, `profiles`).

### 🟡 S2 — 16 `console.*` statements ship to production
Noise + minor info leakage. Strip via `esbuild: { drop: ['console'] }` (see P5).

---

## 4. Recommended order of work

**Phase 1 — Perceived load (do first, low risk, high impact)**
1. P1: stop gating Discover on `workspaceLoading`.
2. P2: add `loading="lazy"` + `decoding="async"`; switch grid thumbnails to `fixed_height_still` / WebP.
3. S1: remove the key `console.log` and `window.supabase`.

**Phase 2 — Data volume (fixes "gets slower over time")**
4. P4: cap/aggregate `view_history`.
5. P3: paginate favourites; stop fetching all `gif_assets`.
6. P7/P8: debounce localStorage writes, note saves, and user search.

**Phase 3 — Bundle & polish**
7. P5: code-split routes, `manualChunks`, drop console.
8. P6: trim font weights / self-host.
9. P2 (cont.): virtualize long lists.
10. P9 + correctness bugs B1–B7.

**Quick wins (minutes each):** S1, B1, B7, P6, lazy-loading attributes.

---

## 5. What's already good
- `AuthContext` correctly de-dupes session changes by user id (`AuthContext.tsx:28-29`) to avoid reload storms on tab focus — a thoughtful fix.
- `useGiphy` has multi-key fallback + an in-memory page-0 cache.
- Graceful offline fallback to `localStorage` when Supabase errors, with a clear sync-status UI.
- Optimistic updates with rollback in `handleToggleFavourite`.
- `prefers-reduced-motion` is respected in CSS.

*These are strengths to preserve while addressing the items above.*
