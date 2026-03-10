export interface UseVirtualListOptions {
  itemCount: number;
  itemHeight: number;
  viewportHeight: number;
  scrollTop: number;
  overscan?: number;
}

export type ScrollAlign = "auto" | "start" | "center" | "end";

export interface GetScrollOffsetForIndexOptions {
  index: number;
  itemCount: number;
  itemHeight: number;
  viewportHeight: number;
  currentScrollTop?: number;
  align?: ScrollAlign;
}

export interface VirtualItem {
  index: number;
  start: number;
  end: number;
  size: number;
}

export interface UseVirtualListResult {
  items: VirtualItem[];
  totalHeight: number;
  paddingTop: number;
  paddingBottom: number;
  startIndex: number;
  endIndex: number;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

export function getScrollOffsetForIndex(
  options: GetScrollOffsetForIndexOptions
): number {
  const itemCount = Math.max(0, Math.floor(options.itemCount));

  if (itemCount === 0) {
    return 0;
  }

  const itemHeight = Math.max(1, options.itemHeight);
  const viewportHeight = Math.max(0, options.viewportHeight);
  const maxIndex = itemCount - 1;
  const index = clamp(Math.floor(options.index), 0, maxIndex);
  const align = options.align ?? "auto";
  const currentScrollTop = Math.max(0, options.currentScrollTop ?? 0);
  const maxScrollTop = Math.max(0, itemCount * itemHeight - viewportHeight);
  const itemStart = index * itemHeight;
  const itemEnd = itemStart + itemHeight;
  const viewportStart = currentScrollTop;
  const viewportEnd = currentScrollTop + viewportHeight;

  if (align === "auto") {
    if (itemStart >= viewportStart && itemEnd <= viewportEnd) {
      return clamp(currentScrollTop, 0, maxScrollTop);
    }

    if (itemStart < viewportStart) {
      return clamp(itemStart, 0, maxScrollTop);
    }

    return clamp(itemEnd - viewportHeight, 0, maxScrollTop);
  }

  if (align === "start") {
    return clamp(itemStart, 0, maxScrollTop);
  }

  if (align === "end") {
    return clamp(itemEnd - viewportHeight, 0, maxScrollTop);
  }

  return clamp(itemStart - (viewportHeight - itemHeight) / 2, 0, maxScrollTop);
}

export function useVirtualList(
  options: UseVirtualListOptions
): UseVirtualListResult {
  const itemCount = Math.max(0, Math.floor(options.itemCount));
  const itemHeight = Math.max(1, options.itemHeight);
  const viewportHeight = Math.max(0, options.viewportHeight);
  const overscan = Math.max(0, Math.floor(options.overscan ?? 2));
  const scrollTop = Math.max(0, options.scrollTop);
  const totalHeight = itemCount * itemHeight;

  if (itemCount === 0 || viewportHeight === 0) {
    return {
      items: [],
      totalHeight,
      paddingTop: 0,
      paddingBottom: 0,
      startIndex: 0,
      endIndex: 0
    };
  }

  const maxIndex = itemCount - 1;
  const visibleStart = clamp(Math.floor(scrollTop / itemHeight), 0, maxIndex);
  const visibleEnd = clamp(
    Math.ceil((scrollTop + viewportHeight) / itemHeight) - 1,
    visibleStart,
    maxIndex
  );
  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(maxIndex, visibleEnd + overscan);
  const items: VirtualItem[] = [];

  for (let index = startIndex; index <= endIndex; index += 1) {
    const start = index * itemHeight;

    items.push({
      index,
      start,
      end: start + itemHeight,
      size: itemHeight
    });
  }

  return {
    items,
    totalHeight,
    paddingTop: startIndex * itemHeight,
    paddingBottom: Math.max(0, totalHeight - (endIndex + 1) * itemHeight),
    startIndex,
    endIndex
  };
}
