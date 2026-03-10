import { describe, expect, it } from "vitest";

import {
  getScrollOffsetForIndex,
  useVirtualList
} from "../src/useVirtualList";

describe("useVirtualList", () => {
  it("calculates the render window with overscan", () => {
    const result = useVirtualList({
      itemCount: 100,
      itemHeight: 40,
      viewportHeight: 120,
      scrollTop: 80,
      overscan: 1
    });

    expect(result.startIndex).toBe(1);
    expect(result.endIndex).toBe(5);
    expect(result.items.map((item) => item.index)).toEqual([1, 2, 3, 4, 5]);
    expect(result.totalHeight).toBe(4000);
    expect(result.paddingTop).toBe(40);
    expect(result.paddingBottom).toBe(3760);
  });

  it("returns an empty render result for an empty list", () => {
    const result = useVirtualList({
      itemCount: 0,
      itemHeight: 40,
      viewportHeight: 200,
      scrollTop: 120
    });

    expect(result).toEqual({
      items: [],
      totalHeight: 0,
      paddingTop: 0,
      paddingBottom: 0,
      startIndex: 0,
      endIndex: 0
    });
  });
});

describe("getScrollOffsetForIndex", () => {
  const baseOptions = {
    itemCount: 100,
    itemHeight: 40,
    viewportHeight: 120
  };

  it("keeps the scroll position when auto-aligned item is already visible", () => {
    expect(
      getScrollOffsetForIndex({
        ...baseOptions,
        index: 3,
        currentScrollTop: 80,
        align: "auto"
      })
    ).toBe(80);
  });

  it("aligns to the start, center, and end positions", () => {
    expect(
      getScrollOffsetForIndex({
        ...baseOptions,
        index: 10,
        align: "start"
      })
    ).toBe(400);

    expect(
      getScrollOffsetForIndex({
        ...baseOptions,
        index: 10,
        align: "center"
      })
    ).toBe(360);

    expect(
      getScrollOffsetForIndex({
        ...baseOptions,
        index: 10,
        align: "end"
      })
    ).toBe(320);
  });

  it("clamps offsets near the bottom of the list", () => {
    expect(
      getScrollOffsetForIndex({
        ...baseOptions,
        index: 99,
        align: "start"
      })
    ).toBe(3880);
  });
});
