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
