interface MasonryGridProps<T> {
  items: T[];
  isCompact?: boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
}

export function MasonryGrid<T>({ items, isCompact = false, renderItem }: MasonryGridProps<T>) {
  return (
    <div className={isCompact ? "masonry-grid-compact" : "masonry-grid"}>
      {items.map((item, index) => renderItem(item, index))}
    </div>
  );
}
