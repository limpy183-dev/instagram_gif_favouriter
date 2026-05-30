import { useEffect, useRef, useState } from "react";

/**
 * Windows a long list so we don't mount hundreds of DOM nodes (and animated
 * images) at once. Renders `step` items initially and grows by `step` whenever
 * the sentinel scrolls near the viewport. Works with the CSS-columns masonry
 * layout (where true virtualization is impractical) by bounding how many cards
 * are mounted rather than absolutely positioning them.
 *
 * Returns the count of items to render, a ref to attach to a sentinel element
 * placed after the list, and whether more items remain.
 */
export function useProgressiveReveal(total: number, step = 30) {
  const [visible, setVisible] = useState(step);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset the window whenever the underlying list size changes (e.g. a filter
  // narrows the results) so we don't keep a stale large window.
  useEffect(() => {
    setVisible(step);
  }, [total, step]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (visible >= total) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible((current) => Math.min(current + step, total));
        }
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, total, step]);

  const visibleCount = Math.min(visible, total);
  return { visibleCount, sentinelRef, hasMore: visibleCount < total };
}
