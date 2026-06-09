import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const masonryGridSource = readFileSync(
  resolve(root, "src", "components", "MasonryGrid.tsx"),
  "utf8",
);
const gifCardSource = readFileSync(
  resolve(root, "src", "components", "GifCard.tsx"),
  "utf8",
);
const indexCssSource = readFileSync(resolve(root, "src", "index.css"), "utf8");
const useGiphySource = readFileSync(
  resolve(root, "src", "hooks", "useGiphy.ts"),
  "utf8",
);

assert.doesNotMatch(
  masonryGridSource,
  /const columns:|columns\[index % colsCount\]|colItems\.map/,
  "GIFs should render in one row-major grid instead of independent columns.",
);

assert.match(
  masonryGridSource,
  /items\.map\(\(item, index\) => renderItem\(item, index\)\)/,
  "The grid should render GIFs in source order so each row shares a baseline.",
);

assert.match(
  gifCardSource,
  /aspect-square[\s\S]*object-cover/,
  "GIF cards should use a consistent frame and crop previews to keep rows aligned.",
);

assert.match(
  useGiphySource,
  /const LIMIT = 24;/,
  "Giphy pagination should continue loading 24 GIFs per page.",
);

assert.doesNotMatch(
  indexCssSource,
  /\.masonry-grid\s*\{[\s\S]*?repeat\(5,\s*1fr\)/,
  "The standard GIF grid must not use five columns because 24-item pages leave progressively incomplete rows.",
);
