import { describe, expect, it } from "vitest";

import {
  getMeasuredScrollOffsetForIndex,
  useMeasuredVirtualList
} from "../src/useMeasuredVirtualList";

describe("useMeasuredVirtualList", () => {
  it("builds a render window from estimated and measured sizes", () => {
    const result = useMeasuredVirtualList({
      itemCount: 5,
      viewportHeight: 90,
      scrollTop: 50,
      overscan: 1,
      estimatedItemSize: 40,
      measuredSizes: {
        1: 80,
        3: 20
      }
    });

    expect(result.startIndex).toBe(0);
    expect(result.endIndex).toBe(3);
    expect(result.items.map((item) => item.index)).toEqual([0, 1, 2, 3]);
    expect(result.totalHeight).toBe(220);
    expect(result.paddingTop).toBe(0);
    expect(result.paddingBottom).toBe(40);
  });
});

describe("getMeasuredScrollOffsetForIndex", () => {
  it("uses measured sizes for alignment", () => {
    expect(
      getMeasuredScrollOffsetForIndex({
        index: 3,
        itemCount: 5,
        viewportHeight: 100,
        align: "start",
        estimatedItemSize: 40,
        measuredSizes: {
          1: 80,
          3: 20
        }
      })
    ).toBe(120);

    expect(
      getMeasuredScrollOffsetForIndex({
        index: 3,
        itemCount: 5,
        viewportHeight: 100,
        align: "end",
        estimatedItemSize: 40,
        measuredSizes: {
          1: 80,
          3: 20
        }
      })
    ).toBe(80);
  });

  it("keeps the current offset when auto-aligned item is visible", () => {
    expect(
      getMeasuredScrollOffsetForIndex({
        index: 2,
        itemCount: 5,
        viewportHeight: 100,
        currentScrollTop: 100,
        align: "auto",
        estimatedItemSize: 40,
        measuredSizes: {
          1: 80,
          3: 20
        }
      })
    ).toBe(100);
  });

  it("supports inverted index positioning", () => {
    expect(
      getMeasuredScrollOffsetForIndex({
        index: 0,
        itemCount: 5,
        viewportHeight: 100,
        align: "end",
        inverted: true,
        estimatedItemSize: 40,
        measuredSizes: {
          1: 80,
          3: 20
        }
      })
    ).toBe(120);

    const result = useMeasuredVirtualList({
      itemCount: 5,
      viewportHeight: 100,
      scrollTop: 0,
      overscan: 0,
      inverted: true,
      estimatedItemSize: 40,
      measuredSizes: {
        1: 80,
        3: 20
      }
    });

    expect(result.items.map((item) => item.index)).toEqual([4, 3, 2]);
  });
});
