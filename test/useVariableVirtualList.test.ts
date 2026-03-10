import { describe, expect, it } from "vitest";

import {
  getVariableScrollOffsetForIndex,
  useVariableVirtualList
} from "../src/useVariableVirtualList";

const sizes = [30, 50, 20, 60, 40, 70];

describe("useVariableVirtualList", () => {
  it("calculates the render window for variable item sizes", () => {
    const result = useVariableVirtualList({
      itemCount: sizes.length,
      viewportHeight: 90,
      scrollTop: 35,
      overscan: 1,
      getItemSize: (index) => sizes[index]
    });

    expect(result.startIndex).toBe(0);
    expect(result.endIndex).toBe(4);
    expect(result.items.map((item) => item.index)).toEqual([0, 1, 2, 3, 4]);
    expect(result.totalHeight).toBe(270);
    expect(result.paddingTop).toBe(0);
    expect(result.paddingBottom).toBe(70);
  });
});

describe("getVariableScrollOffsetForIndex", () => {
  it("aligns a variable-size item to the requested position", () => {
    expect(
      getVariableScrollOffsetForIndex({
        index: 3,
        itemCount: sizes.length,
        viewportHeight: 100,
        align: "start",
        getItemSize: (index) => sizes[index]
      })
    ).toBe(100);

    expect(
      getVariableScrollOffsetForIndex({
        index: 3,
        itemCount: sizes.length,
        viewportHeight: 100,
        align: "end",
        getItemSize: (index) => sizes[index]
      })
    ).toBe(60);
  });

  it("keeps the current scroll offset when auto-aligned item is visible", () => {
    expect(
      getVariableScrollOffsetForIndex({
        index: 2,
        itemCount: sizes.length,
        viewportHeight: 100,
        currentScrollTop: 20,
        align: "auto",
        getItemSize: (index) => sizes[index]
      })
    ).toBe(20);
  });
});
