import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "..");
const read = (...parts) => readFileSync(resolve(root, ...parts), "utf8");

const appSource = read("src", "App.tsx");
const workspaceSource = read("src", "hooks", "useWorkspace.ts");
const gifCardSource = read("src", "components", "GifCard.tsx");
const gifModalSource = read("src", "components", "GifModal.tsx");
const favouritesPageSource = read("src", "pages", "FavouritesPage.tsx");
const publicCollectionSource = read("src", "pages", "PublicCollectionPage.tsx");
const publicProfileSource = read("src", "components", "users", "PublicProfileView.tsx");
const queuePanelSource = read("src", "components", "favourites", "QueuePanel.tsx");
const viteConfigSource = read("vite.config.ts");

assert.doesNotMatch(
  appSource,
  /!workspaceLoading\s*&&\s*page\s*===\s*"discover"/,
  "Discover should not be hidden behind the Supabase workspace load."
);

assert.match(
  appSource,
  /\[\.\.\.favourites,\s*\.\.\.workspace\.manualImports,\s*\.\.\.gifs\]/,
  "Recently viewed should resolve GIFs from current Giphy results, not only favourites/imports."
);

assert.match(
  appSource,
  /window\.setTimeout\(\(\)\s*=>\s*\{[\s\S]*searchUsers\(userSearch\)/,
  "User search should debounce profile queries instead of querying on every keystroke."
);

assert.match(
  appSource,
  /lazy\(\(\)\s*=>\s*import\("\.\/pages\/DiscoverPage"\)/,
  "Route pages should be React.lazy imports so the bundle is split by page."
);

assert.match(
  gifCardSource,
  /loading="lazy"[\s\S]*decoding="async"/,
  "GIF grid images should be lazy-loaded and asynchronously decoded."
);

assert.match(
  gifCardSource,
  /getStillPreviewUrl\(gif\)[\s\S]*getAnimatedPreviewUrl\(gif\)/,
  "GIF cards should use still thumbnails by default and animated/WebP previews only when needed."
);

for (const [name, source] of [
  ["FavouritesPage", favouritesPageSource],
  ["PublicCollectionPage", publicCollectionSource],
  ["PublicProfileView", publicProfileSource],
]) {
  assert.match(source, /useProgressiveReveal/, `${name} should progressively reveal long GIF lists.`);
  assert.match(source, /\.slice\(0,\s*visibleCount\)/, `${name} should only mount the visible GIF window.`);
}

assert.match(
  workspaceSource,
  /const HISTORY_LOAD_LIMIT = \d+;/,
  "Workspace history reads should have a fixed upper bound."
);

assert.match(
  workspaceSource,
  /\.from\("view_history"\)[\s\S]*\.limit\(HISTORY_LOAD_LIMIT\)/,
  "Workspace history load should use the fixed history limit."
);

assert.match(
  workspaceSource,
  /\.from\("view_history"\)[\s\S]*\.delete\(\)[\s\S]*\.lt\("viewed_at", cutoff/,
  "Saving history should prune old rows so view_history does not grow forever."
);

assert.match(
  workspaceSource,
  /\.from\("gif_assets"\)[\s\S]*\.like\("gif_id", "import-%"\)/,
  "Workspace load should only fetch manual-import GIF assets."
);

assert.match(
  workspaceSource,
  /const FAVOURITES_PAGE_SIZE = \d+;/,
  "Favourites should be paginated instead of fetched without a limit."
);

assert.match(
  workspaceSource,
  /\.from\("favourites"\)[\s\S]*\.range\(from, to\)/,
  "Favourites load should request a bounded page from Supabase."
);

assert.match(
  workspaceSource,
  /workspaceRef\.current/,
  "Workspace mutation handlers should read the latest workspace via a ref before persisting."
);

assert.doesNotMatch(
  workspaceSource,
  /saveCollection\(\{\s*\.\.\.workspace\.collections\.find/,
  "Queue/collection DB writes should not be built from closure-captured workspace collections."
);

assert.match(
  gifModalSource,
  /NOTE_SAVE_DEBOUNCE_MS/,
  "Notes should be saved after an idle debounce rather than on every keystroke."
);

assert.match(
  gifModalSource,
  /onBlur=\{flushNote\}/,
  "Notes should flush on blur so pending debounced edits are not lost."
);

assert.match(
  queuePanelSource,
  /getStillPreviewUrl\(gif\)[\s\S]*loading="lazy"[\s\S]*decoding="async"/,
  "Queue thumbnails should use lightweight lazy still previews."
);

assert.match(
  appSource,
  /publicFavouritesVal = false;/,
  "Public user loading should fail closed when privacy/RLS columns cannot be read."
);

assert.doesNotMatch(
  appSource,
  /publicFavourites:\s*true,\s*\/\/ assume true/i,
  "User search fallback should not mark privacy-unknown users as having public favourites."
);

assert.match(
  viteConfigSource,
  /drop:\s*\["console",\s*"debugger"\]/,
  "Production builds should strip console/debugger statements."
);

assert.match(
  viteConfigSource,
  /manualChunks:\s*\{[\s\S]*react:\s*\["react",\s*"react-dom"\][\s\S]*supabase:\s*\["@supabase\/supabase-js"\]/,
  "Production builds should split React and Supabase vendor chunks."
);
