import { useEffect, useState } from "react";

export function useWindowColumns(isCompact = false) {
  const [columns, setColumns] = useState(2);

  useEffect(() => {
    const m640 = window.matchMedia("(min-width: 640px)");
    const m1024 = window.matchMedia("(min-width: 1024px)");
    const m1280 = window.matchMedia("(min-width: 1280px)");
    const m1536 = window.matchMedia("(min-width: 1536px)");

    const updateColumns = () => {
      if (isCompact) {
        if (m1536.matches) setColumns(4);
        else if (m1280.matches) setColumns(3);
        else if (m1024.matches) setColumns(3);
        else if (m640.matches) setColumns(2);
        else setColumns(2);
      } else {
        if (m1280.matches) setColumns(5);
        else if (m1024.matches) setColumns(4);
        else if (m640.matches) setColumns(3);
        else setColumns(2);
      }
    };

    updateColumns();

    const listeners = [m640, m1024, m1280, m1536];
    listeners.forEach((l) => l.addEventListener("change", updateColumns));

    return () => {
      listeners.forEach((l) => l.removeEventListener("change", updateColumns));
    };
  }, [isCompact]);

  return columns;
}

interface MasonryGridProps<T> {
  items: T[];
  isCompact?: boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
}

export function MasonryGrid<T>({ items, isCompact = false, renderItem }: MasonryGridProps<T>) {
  const colsCount = useWindowColumns(isCompact);

  // Distribute items into columns
  const columns: T[][] = Array.from({ length: colsCount }, () => []);
  items.forEach((item, index) => {
    columns[index % colsCount].push(item);
  });

  return (
    <div
      className="grid gap-3"
      style={{
        gridTemplateColumns: `repeat(${colsCount}, minmax(0, 1fr))`,
      }}
    >
      {columns.map((colItems, colIdx) => (
        <div key={colIdx} className="flex flex-col gap-3">
          {colItems.map((item, itemIdx) => {
            const originalIndex = itemIdx * colsCount + colIdx;
            return renderItem(item, originalIndex);
          })}
        </div>
      ))}
    </div>
  );
}
