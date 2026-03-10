import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VariableVirtualList } from "../src/VariableVirtualList";
import { type VirtualListHandle } from "../src/VirtualList";

const items = [
  { id: "a", label: "Row 0", size: 30 },
  { id: "b", label: "Row 1", size: 50 },
  { id: "c", label: "Row 2", size: 20 },
  { id: "d", label: "Row 3", size: 60 },
  { id: "e", label: "Row 4", size: 40 },
  { id: "f", label: "Row 5", size: 70 }
];

describe("VariableVirtualList", () => {
  it("renders only the visible variable-size rows plus overscan", () => {
    render(
      <VariableVirtualList
        items={items}
        height={90}
        overscan={1}
        initialScrollOffset={35}
        getItemSize={(item) => item.size}
        getItemKey={(item) => item.id}
        renderItem={(item) => <div>{item.label}</div>}
      />
    );

    expect(screen.getByText("Row 0")).toBeInTheDocument();
    expect(screen.getByText("Row 4")).toBeInTheDocument();
    expect(screen.queryByText("Row 5")).not.toBeInTheDocument();
  });

  it("supports scrollToIndex for variable-size items", () => {
    const ref = React.createRef<VirtualListHandle>();

    render(
      <VariableVirtualList
        ref={ref}
        items={items}
        height={100}
        overscan={1}
        getItemSize={(item) => item.size}
        getItemKey={(item) => item.id}
        renderItem={(item) => <div>{item.label}</div>}
      />
    );

    act(() => {
      ref.current?.scrollToIndex({
        index: 3,
        align: "start"
      });
    });

    expect(ref.current?.getScrollOffset()).toBe(100);
    expect(ref.current?.getScrollElement()?.scrollTop).toBe(100);
    expect(screen.getByText("Row 3")).toBeInTheDocument();

    act(() => {
      ref.current?.scrollToBottom();
    });

    expect(ref.current?.getScrollOffset()).toBe(170);
  });
});
