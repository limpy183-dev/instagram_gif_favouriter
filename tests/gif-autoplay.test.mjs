import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "..");
const gifCardSource = readFileSync(resolve(root, "src", "components", "GifCard.tsx"), "utf8");

assert.match(
  gifCardSource,
  /const previewUrl = getAnimatedPreviewUrl\(gif\);/,
  "GIF cards should use the animated preview URL immediately."
);

assert.doesNotMatch(
  gifCardSource,
  /hovered|onMouseEnter|onMouseLeave|getStillPreviewUrl/,
  "GIF card animation should not depend on pointer hover."
);
