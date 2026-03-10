import { describe, expect, it } from "vitest";

import { MeasurementStore } from "../src/measurementStore";

describe("MeasurementStore", () => {
  it("supports prefix offsets, range lookup, and incremental updates", () => {
    const store = new MeasurementStore(5, (index) => 40 + index * 10);

    expect(store.getOffset(0)).toBe(0);
    expect(store.getOffset(3)).toBe(150);
    expect(store.getTotalHeight()).toBe(300);
    expect(store.findNearestIndex(151)).toBe(3);

    const delta = store.setSize(1, 100);

    expect(delta).toBe(50);
    expect(store.getOffset(3)).toBe(200);
    expect(store.getTotalHeight()).toBe(350);

    const range = store.getRange(90, 120, 1);

    expect(range.startIndex).toBe(0);
    expect(range.endIndex).toBe(4);
    expect(range.items.map((item) => item.index)).toEqual([0, 1, 2, 3, 4]);

    const invertedRange = store.getRange(0, 120, 0, true);

    expect(invertedRange.items.map((item) => item.index)).toEqual([4, 3]);
  });
});
