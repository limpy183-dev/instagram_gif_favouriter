import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "..");
const appSource = readFileSync(resolve(root, "src", "App.tsx"), "utf8");
const favouritesSource = readFileSync(resolve(root, "src", "pages", "FavouritesPage.tsx"), "utf8");

assert.match(
  appSource,
  /<FavouritesPage[\s\S]*\bonOpenGif=\{setSelectedGif\}/,
  "FavouritesPage should open the GIF modal directly so opening a favourite does not mutate history or click counts."
);

assert.match(
  favouritesSource,
  /\bonOpenGif:\s*\(gif:\s*Gif\)\s*=>\s*void;/,
  "FavouritesPage should expose a dedicated onOpenGif prop for GIF card selection."
);

assert.match(
  favouritesSource,
  /<GifCard[\s\S]*\bonSelect=\{onOpenGif\}/,
  "Favourite GIF cards should call onOpenGif when selected."
);
