import { type VirtualItem } from "./useVirtualList";

export interface MeasurementStoreRange {
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

function normalizeSize(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, value);
}

class FenwickTree {
  private readonly tree: number[];

  constructor(size: number) {
    this.tree = new Array(size + 1).fill(0);
  }

  update(index: number, delta: number): void {
    let currentIndex = index + 1;

    while (currentIndex < this.tree.length) {
      this.tree[currentIndex] += delta;
      currentIndex += currentIndex & -currentIndex;
    }
  }

  query(endExclusive: number): number {
    let sum = 0;
    let currentIndex = endExclusive;

    while (currentIndex > 0) {
      sum += this.tree[currentIndex];
      currentIndex -= currentIndex & -currentIndex;
    }

    return sum;
  }

  lowerBound(target: number): number {
    if (target <= 0) {
      return 0;
    }

    let index = 0;
    let bit = 1;

    while (bit * 2 < this.tree.length) {
      bit *= 2;
    }

    let remaining = target;

    while (bit !== 0) {
      const nextIndex = index + bit;

      if (
        nextIndex < this.tree.length &&
        this.tree[nextIndex] < remaining
      ) {
        index = nextIndex;
        remaining -= this.tree[nextIndex];
      }

      bit >>= 1;
    }

    return Math.min(index, this.tree.length - 2);
  }
}

export class MeasurementStore {
  private readonly tree: FenwickTree;

  private readonly sizes: number[];

  private readonly itemCount: number;

  constructor(
    itemCount: number,
    getEstimatedSize: (index: number) => number
  ) {
    this.itemCount = Math.max(0, Math.floor(itemCount));
    this.tree = new FenwickTree(this.itemCount);
    this.sizes = new Array<number>(this.itemCount);

    for (let index = 0; index < this.itemCount; index += 1) {
      const size = normalizeSize(getEstimatedSize(index));

      this.sizes[index] = size;
      this.tree.update(index, size);
    }
  }

  getItemCount(): number {
    return this.itemCount;
  }

  getSize(index: number): number {
    return this.sizes[index] ?? 0;
  }

  getOffset(index: number): number {
    const safeIndex = clamp(index, 0, this.itemCount);

    return this.tree.query(safeIndex);
  }

  getTotalHeight(): number {
    return this.tree.query(this.itemCount);
  }

  setSize(index: number, nextSize: number): number {
    if (index < 0 || index >= this.itemCount) {
      return 0;
    }

    const normalizedSize = normalizeSize(nextSize);
    const previousSize = this.sizes[index];

    if (previousSize === normalizedSize) {
      return 0;
    }

    const delta = normalizedSize - previousSize;

    this.sizes[index] = normalizedSize;
    this.tree.update(index, delta);

    return delta;
  }

  findNearestIndex(offset: number): number {
    if (this.itemCount === 0) {
      return 0;
    }

    return clamp(this.tree.lowerBound(offset + 1), 0, this.itemCount - 1);
  }

  getRange(
    scrollTop: number,
    viewportHeight: number,
    overscan: number,
    inverted = false
  ): MeasurementStoreRange {
    if (this.itemCount === 0 || viewportHeight <= 0) {
      return {
        items: [],
        totalHeight: this.getTotalHeight(),
        paddingTop: 0,
        paddingBottom: 0,
        startIndex: 0,
        endIndex: 0
      };
    }

    const maxIndex = this.itemCount - 1;

    if (inverted) {
      const totalHeight = this.getTotalHeight();
      const visibleTopIndex = clamp(
        this.tree.lowerBound(totalHeight - Math.max(0, scrollTop)),
        0,
        maxIndex
      );
      const viewportEnd = Math.max(0, scrollTop) + Math.max(0, viewportHeight);
      let visibleBottomIndex = visibleTopIndex;
      const getVisualStart = (index: number) =>
        totalHeight - this.getOffset(index) - this.getSize(index);

      while (
        visibleBottomIndex > 0 &&
        getVisualStart(visibleBottomIndex - 1) < viewportEnd
      ) {
        visibleBottomIndex -= 1;
      }

      const renderTopIndex = Math.min(
        maxIndex,
        visibleTopIndex + Math.max(0, overscan)
      );
      const renderBottomIndex = Math.max(
        0,
        visibleBottomIndex - Math.max(0, overscan)
      );
      const items: VirtualItem[] = [];

      for (let index = renderTopIndex; index >= renderBottomIndex; index -= 1) {
        const start = getVisualStart(index);
        const size = this.getSize(index);

        items.push({
          index,
          start,
          end: start + size,
          size
        });
      }

      const firstItem = items[0];
      const lastItem = items[items.length - 1];

      return {
        items,
        totalHeight,
        paddingTop: firstItem ? firstItem.start : 0,
        paddingBottom: lastItem ? Math.max(0, totalHeight - lastItem.end) : 0,
        startIndex: renderBottomIndex,
        endIndex: renderTopIndex
      };
    }

    const visibleStart = this.findNearestIndex(Math.max(0, scrollTop));
    const viewportEnd = Math.max(0, scrollTop) + Math.max(0, viewportHeight);
    let visibleEnd = visibleStart;

    while (
      visibleEnd < maxIndex &&
      this.getOffset(visibleEnd) + this.getSize(visibleEnd) < viewportEnd
    ) {
      visibleEnd += 1;
    }

    const startIndex = Math.max(0, visibleStart - Math.max(0, overscan));
    const endIndex = Math.min(maxIndex, visibleEnd + Math.max(0, overscan));
    const items: VirtualItem[] = [];

    for (let index = startIndex; index <= endIndex; index += 1) {
      const start = this.getOffset(index);
      const size = this.getSize(index);

      items.push({
        index,
        start,
        end: start + size,
        size
      });
    }

    const totalHeight = this.getTotalHeight();

    return {
      items,
      totalHeight,
      paddingTop: this.getOffset(startIndex),
      paddingBottom: Math.max(
        0,
        totalHeight - this.getOffset(endIndex) - this.getSize(endIndex)
      ),
      startIndex,
      endIndex
    };
  }
}
