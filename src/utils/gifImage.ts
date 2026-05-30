import type { Gif } from "../types";

/**
 * Animated preview URL for grid cards. Prefers the animated WebP (a fraction of
 * the size of the equivalent GIF) and falls back to the GIF, then the original.
 */
export function getAnimatedPreviewUrl(gif: Gif): string {
  const fh = gif.images?.fixed_height;
  return fh?.webp || fh?.url || gif.images?.original?.url || "";
}

/**
 * Static preview frame for grid cards. Uses the still frame when Giphy provides
 * one (tiny, decodes instantly) and falls back to the animated preview so
 * manually-imported GIFs (which have no still) still render.
 */
export function getStillPreviewUrl(gif: Gif): string {
  return gif.images?.fixed_height_still?.url || getAnimatedPreviewUrl(gif);
}

/** Full-resolution URL for the modal. Prefers WebP when available. */
export function getFullUrl(gif: Gif): string {
  const original = gif.images?.original;
  return original?.webp || original?.url || getAnimatedPreviewUrl(gif);
}
