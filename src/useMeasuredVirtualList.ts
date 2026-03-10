import { type ScrollAlign, type VirtualItem } from "./useVirtualList";

export interface UseMeasuredVirtualListOptions {
  itemCount: number;
  viewportHeight: number;
  scrollTop: number;
  overscan?: number;
  inverted?: boolean;
  estimatedItemSize: number | ((index: number) => number);
  measuredSizes?: Partial<Record<number, number>>;
}

export interface GetMeasuredScrollOffsetForIndexOptions {
  index: number;
  itemCount: number;
  viewportHeight: number;
  currentScrollTop?: number;
  align?: ScrollAlign;
  inverted?: boolean;
  estimatedItemSize: number | ((index: number) => number);
  measuredSizes?: Partial<Record<number, number>>;
}

export interface UseMeasuredVirtualListResult {
  items: VirtualItem[];
  totalHeight: number;
  paddingTop: number;
  paddingBottom: number;
  startIndex: number;
  endIndex: number;
}

export interface MeasuredVirtualLayout {
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

function resolveEstimatedItemSize(
  estimatedItemSize: number | ((index: number) => number),
  index: number
): number {
  if (typeof estimatedItemSize === "function") {
    return normalizeSize(estimatedItemSize(index));
  }

  return normalizeSize(estimatedItemSize);
}

export function buildMeasuredVirtualLayout(
  itemCount: number,
  estimatedItemSize: number | ((index: number) => number),
  measuredSizes: Partial<Record<number, number>> = {}
): MeasuredVirtualLayout {
  const offsets = new Array<number>(itemCount);
  const sizes = new Array<number>(itemCount);
  let totalHeight = 0;

  for (let index = 0; index < itemCount; index += 1) {
    const size = normalizeSize(
      measuredSizes[index] ?? resolveEstimatedItemSize(estimatedItemSize, index)
    );

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

export function getMeasuredScrollOffsetForIndex(
  options: GetMeasuredScrollOffsetForIndexOptions
): number {
  const itemCount = Math.max(0, Math.floor(options.itemCount));

  if (itemCount === 0) {
    return 0;
  }

  const viewportHeight = Math.max(0, options.viewportHeight);
  const currentScrollTop = Math.max(0, options.currentScrollTop ?? 0);
  const align = options.align ?? "auto";
  const inverted = options.inverted ?? false;
  const { offsets, sizes, totalHeight } = buildMeasuredVirtualLayout(
    itemCount,
    options.estimatedItemSize,
    options.measuredSizes
  );
  const maxIndex = itemCount - 1;
  const index = clamp(Math.floor(options.index), 0, maxIndex);
  const itemStart = inverted
    ? totalHeight - offsets[index] - sizes[index]
    : offsets[index];
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

export function useMeasuredVirtualList(
  options: UseMeasuredVirtualListOptions
): UseMeasuredVirtualListResult {
  const itemCount = Math.max(0, Math.floor(options.itemCount));
  const viewportHeight = Math.max(0, options.viewportHeight);
  const scrollTop = Math.max(0, options.scrollTop);
  const overscan = Math.max(0, Math.floor(options.overscan ?? 2));
  const inverted = options.inverted ?? false;

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

  const { offsets, sizes, totalHeight } = buildMeasuredVirtualLayout(
    itemCount,
    options.estimatedItemSize,
    options.measuredSizes
  );
  const maxIndex = itemCount - 1;

  if (inverted) {
    const visualItems: VirtualItem[] = [];

    for (let index = maxIndex; index >= 0; index -= 1) {
      const size = sizes[index];
      const start = totalHeight - offsets[index] - size;

      visualItems.push({
        index,
        start,
        end: start + size,
        size
      });
    }

    const visualStarts = visualItems.map((item) => item.start);
    const visualSizes = visualItems.map((item) => item.size);
    const visibleStartPosition = findNearestItem(
      visualStarts,
      visualSizes,
      scrollTop
    );
    const viewportEnd = scrollTop + viewportHeight;
    let visibleEndPosition = visibleStartPosition;

    while (
      visibleEndPosition < maxIndex &&
      visualItems[visibleEndPosition].end < viewportEnd
    ) {
      visibleEndPosition += 1;
    }

    const renderStartPosition = Math.max(0, visibleStartPosition - overscan);
    const renderEndPosition = Math.min(maxIndex, visibleEndPosition + overscan);
    const items = visualItems.slice(renderStartPosition, renderEndPosition + 1);
    const startIndex = items.length === 0 ? 0 : items[items.length - 1].index;
    const endIndex = items.length === 0 ? 0 : items[0].index;
    const firstItem = items[0];
    const lastItem = items[items.length - 1];

    return {
      items,
      totalHeight,
      paddingTop: firstItem ? firstItem.start : 0,
      paddingBottom: lastItem ? Math.max(0, totalHeight - lastItem.end) : 0,
      startIndex,
      endIndex
    };
  }

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
