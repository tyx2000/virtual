import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VirtualList, type VirtualListHandle } from "../src/VirtualList";

function createItems(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `Row ${index}`);
}

describe("VirtualList", () => {
  it("renders only the visible rows plus overscan", () => {
    render(
      <VirtualList
        items={createItems(50)}
        height={120}
        itemHeight={40}
        overscan={1}
        initialScrollOffset={80}
        renderItem={(item) => <div>{item}</div>}
      />
    );

    expect(screen.getByText("Row 1")).toBeInTheDocument();
    expect(screen.getByText("Row 5")).toBeInTheDocument();
    expect(screen.queryByText("Row 0")).not.toBeInTheDocument();
    expect(screen.queryByText("Row 6")).not.toBeInTheDocument();
  });

  it("exposes scroll controls through the forwarded ref", () => {
    const ref = React.createRef<VirtualListHandle>();

    render(
      <VirtualList
        ref={ref}
        items={createItems(100)}
        height={120}
        itemHeight={40}
        overscan={1}
        renderItem={(item) => <div>{item}</div>}
      />
    );

    act(() => {
      ref.current?.scrollToIndex({
        index: 10,
        align: "start"
      });
    });

    expect(ref.current?.getScrollOffset()).toBe(400);
    expect(ref.current?.getScrollElement()?.scrollTop).toBe(400);
    expect(screen.getByText("Row 10")).toBeInTheDocument();
    expect(screen.queryByText("Row 0")).not.toBeInTheDocument();

    act(() => {
      ref.current?.scrollToBottom();
    });

    expect(ref.current?.getScrollOffset()).toBe(3880);
  });
});
