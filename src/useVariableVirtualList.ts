import { type ScrollAlign, type VirtualItem } from "./useVirtualList";

export interface UseVariableVirtualListOptions {
  itemCount: number;
  viewportHeight: number;
  scrollTop: number;
  overscan?: number;
  getItemSize: (index: number) => number;
}

export interface GetVariableScrollOffsetForIndexOptions {
  index: number;
  itemCount: number;
  viewportHeight: number;
  currentScrollTop?: number;
  align?: ScrollAlign;
  getItemSize: (index: number) => number;
}

export interface UseVariableVirtualListResult {
  items: VirtualItem[];
  totalHeight: number;
  paddingTop: number;
  paddingBottom: number;
  startIndex: number;
  endIndex: number;
}

interface ItemMeasurements {
  offsets: number[];
  sizes: number[];
  totalHeight: number;
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

function normalizeSize(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, value);
}

function buildItemMeasurements(
  itemCount: number,
  getItemSize: (index: number) => number
): ItemMeasurements {
  const offsets = new Array<number>(itemCount);
  const sizes = new Array<number>(itemCount);
  let totalHeight = 0;

  for (let index = 0; index < itemCount; index += 1) {
    const size = normalizeSize(getItemSize(index));

    offsets[index] = totalHeight;
    sizes[index] = size;
    totalHeight += size;
  }

  return {
    offsets,
    sizes,
    totalHeight
  };
}

function findNearestItem(
  offsets: number[],
  sizes: number[],
  targetOffset: number
): number {
  let low = 0;
  let high = offsets.length - 1;
  let candidate = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const start = offsets[mid];
    const end = start + sizes[mid];

    if (targetOffset < start) {
      high = mid - 1;
      continue;
    }

    candidate = mid;

    if (targetOffset >= end) {
      low = mid + 1;
      continue;
    }

    return mid;
  }

  return candidate;
}

function getItemMeasurements(
  itemCount: number,
  getItemSize: (index: number) => number
): ItemMeasurements {
  return buildItemMeasurements(itemCount, getItemSize);
}

export function getVariableScrollOffsetForIndex(
  options: GetVariableScrollOffsetForIndexOptions
): number {
  const itemCount = Math.max(0, Math.floor(options.itemCount));

  if (itemCount === 0) {
    return 0;
  }

  const viewportHeight = Math.max(0, options.viewportHeight);
  const currentScrollTop = Math.max(0, options.currentScrollTop ?? 0);
  const align = options.align ?? "auto";
  const { offsets, sizes, totalHeight } = getItemMeasurements(
    itemCount,
    options.getItemSize
  );
  const maxIndex = itemCount - 1;
  const index = clamp(Math.floor(options.index), 0, maxIndex);
  const itemStart = offsets[index];
  const itemSize = sizes[index];
  const itemEnd = itemStart + itemSize;
  const viewportStart = currentScrollTop;
  const viewportEnd = viewportStart + viewportHeight;
  const maxScrollTop = Math.max(0, totalHeight - viewportHeight);

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

  return clamp(itemStart - (viewportHeight - itemSize) / 2, 0, maxScrollTop);
}

export function useVariableVirtualList(
  options: UseVariableVirtualListOptions
): UseVariableVirtualListResult {
  const itemCount = Math.max(0, Math.floor(options.itemCount));
  const viewportHeight = Math.max(0, options.viewportHeight);
  const scrollTop = Math.max(0, options.scrollTop);
  const overscan = Math.max(0, Math.floor(options.overscan ?? 2));

  if (itemCount === 0 || viewportHeight === 0) {
    return {
      items: [],
      totalHeight: 0,
      paddingTop: 0,
      paddingBottom: 0,
      startIndex: 0,
      endIndex: 0
    };
  }

  const { offsets, sizes, totalHeight } = getItemMeasurements(
    itemCount,
    options.getItemSize
  );
  const maxIndex = itemCount - 1;
  const visibleStart = findNearestItem(offsets, sizes, scrollTop);
  const viewportEnd = scrollTop + viewportHeight;
  let visibleEnd = visibleStart;

  while (
    visibleEnd < maxIndex &&
    offsets[visibleEnd] + sizes[visibleEnd] < viewportEnd
  ) {
    visibleEnd += 1;
  }

  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(maxIndex, visibleEnd + overscan);
  const items: VirtualItem[] = [];

  for (let index = startIndex; index <= endIndex; index += 1) {
    const start = offsets[index];
    const size = sizes[index];

    items.push({
      index,
      start,
      end: start + size,
      size
    });
  }

  return {
    items,
    totalHeight,
    paddingTop: offsets[startIndex],
    paddingBottom: Math.max(
      0,
      totalHeight - offsets[endIndex] - sizes[endIndex]
    ),
    startIndex,
    endIndex
  };
}
