import * as React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MeasuredVirtualList } from "../src/MeasuredVirtualList";
import { type VirtualListHandle } from "../src/VirtualList";

describe("MeasuredVirtualList", () => {
  it("adjusts scroll position when measured items before the viewport grow", async () => {
    const ref = React.createRef<VirtualListHandle>();
    const items = [
      { id: "a", label: "Row 0", size: 100 },
      { id: "b", label: "Row 1", size: 40 },
      { id: "c", label: "Row 2", size: 40 },
      { id: "d", label: "Row 3", size: 40 }
    ];

    render(
      <MeasuredVirtualList
        ref={ref}
        items={items}
        height={80}
        overscan={1}
        initialScrollOffset={60}
        estimatedItemSize={40}
        getItemKey={(item) => item.id}
        renderItem={(item) => (
          <div data-measured-size={item.size} style={{ height: `${item.size}px` }}>
            {item.label}
          </div>
        )}
      />
    );

    await waitFor(() => {
      expect(ref.current?.getScrollOffset()).toBe(120);
    });

    expect(ref.current?.getScrollElement()?.scrollTop).toBe(120);
    expect(screen.getByText("Row 1")).toBeInTheDocument();
  });

  it("uses measured sizes when scrolling to an index", async () => {
    const ref = React.createRef<VirtualListHandle>();
    const items = [
      { id: "a", label: "Row 0", size: 30 },
      { id: "b", label: "Row 1", size: 50 },
      { id: "c", label: "Row 2", size: 20 },
      { id: "d", label: "Row 3", size: 60 },
      { id: "e", label: "Row 4", size: 40 }
    ];

    render(
      <MeasuredVirtualList
        ref={ref}
        items={items}
        height={100}
        overscan={1}
        estimatedItemSize={40}
        getItemKey={(item) => item.id}
        renderItem={(item) => (
          <div data-measured-size={item.size} style={{ height: `${item.size}px` }}>
            {item.label}
          </div>
        )}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Row 0")).toBeInTheDocument();
    });

    act(() => {
      ref.current?.scrollToIndex({
        index: 3,
        align: "start"
      });
    });

    expect(ref.current?.getScrollOffset()).toBe(100);
    expect(ref.current?.getScrollElement()?.scrollTop).toBe(100);
    expect(screen.getByText("Row 3")).toBeInTheDocument();
  });

  it("follows appended output when the user is at the bottom", async () => {
    const ref = React.createRef<VirtualListHandle>();
    const initialItems = [
      { id: "a", label: "Row 0", size: 40 },
      { id: "b", label: "Row 1", size: 40 },
      { id: "c", label: "Row 2", size: 40 }
    ];
    const nextItems = [
      ...initialItems,
      { id: "d", label: "Row 3", size: 100 }
    ];
    const { rerender } = render(
      <MeasuredVirtualList
        ref={ref}
        items={initialItems}
        height={80}
        overscan={1}
        followOutput
        estimatedItemSize={40}
        getItemKey={(item) => item.id}
        renderItem={(item) => (
          <div data-measured-size={item.size} style={{ height: `${item.size}px` }}>
            {item.label}
          </div>
        )}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Row 2")).toBeInTheDocument();
    });

    act(() => {
      ref.current?.scrollToBottom();
    });

    expect(ref.current?.getScrollOffset()).toBe(40);

    rerender(
      <MeasuredVirtualList
        ref={ref}
        items={nextItems}
        height={80}
        overscan={1}
        followOutput
        estimatedItemSize={40}
        getItemKey={(item) => item.id}
        renderItem={(item) => (
          <div data-measured-size={item.size} style={{ height: `${item.size}px` }}>
            {item.label}
          </div>
        )}
      />
    );

    await waitFor(() => {
      expect(ref.current?.getScrollOffset()).toBe(140);
    });

    expect(ref.current?.getScrollElement()?.scrollTop).toBe(140);
  });

  it("anchors short content to the bottom when requested", async () => {
    const items = [
      { id: "a", label: "Row 0", size: 40 },
      { id: "b", label: "Row 1", size: 40 }
    ];

    render(
      <MeasuredVirtualList
        items={items}
        height={200}
        overscan={1}
        anchorBottom
        estimatedItemSize={40}
        getItemKey={(item) => item.id}
        renderItem={(item) => (
          <div data-measured-size={item.size} style={{ height: `${item.size}px` }}>
            {item.label}
          </div>
        )}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Row 1")).toBeInTheDocument();
    });

    const row0Wrapper = screen.getByText("Row 0").parentElement?.parentElement;
    const row1Wrapper = screen.getByText("Row 1").parentElement?.parentElement;

    expect(row0Wrapper).toHaveStyle("transform: translateY(120px)");
    expect(row1Wrapper).toHaveStyle("transform: translateY(160px)");
  });

  it("supports inverted visual order and scrollToIndex semantics", async () => {
    const ref = React.createRef<VirtualListHandle>();
    const items = [
      { id: "a", label: "Row 0", size: 40 },
      { id: "b", label: "Row 1", size: 40 },
      { id: "c", label: "Row 2", size: 40 }
    ];

    render(
      <MeasuredVirtualList
        ref={ref}
        items={items}
        height={80}
        overscan={0}
        inverted
        estimatedItemSize={40}
        getItemKey={(item) => item.id}
        renderItem={(item) => (
          <div data-measured-size={item.size} style={{ height: `${item.size}px` }}>
            {item.label}
          </div>
        )}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Row 2")).toBeInTheDocument();
    });

    const row2Wrapper = screen.getByText("Row 2").parentElement?.parentElement;
    const row1Wrapper = screen.getByText("Row 1").parentElement?.parentElement;

    expect(row2Wrapper).toHaveStyle("transform: translateY(0px)");
    expect(row1Wrapper).toHaveStyle("transform: translateY(40px)");

    act(() => {
      ref.current?.scrollToIndex({
        index: 0,
        align: "end"
      });
    });

    expect(ref.current?.getScrollOffset()).toBe(40);
  });

  it("renders a sticky header and pushes it when the next sticky item arrives", async () => {
    const items = [
      { id: "h0", label: "Header 0", size: 30 },
      { id: "r1", label: "Row 1", size: 40 },
      { id: "h2", label: "Header 2", size: 30 },
      { id: "r3", label: "Row 3", size: 40 }
    ];

    render(
      <MeasuredVirtualList
        items={items}
        height={80}
        overscan={1}
        initialScrollOffset={60}
        stickyIndexes={[0, 2]}
        estimatedItemSize={40}
        getItemKey={(item) => item.id}
        renderItem={(item) => (
          <div data-measured-size={item.size} style={{ height: `${item.size}px` }}>
            {item.label}
          </div>
        )}
      />
    );

    await waitFor(() => {
      expect(document.querySelector("[data-sticky-index='0']")).not.toBeNull();
    });

    const sticky = document.querySelector("[data-sticky-index='0']");

    expect(sticky).not.toBeNull();
    expect(sticky).toHaveStyle("transform: translateY(-10px)");
  });

  it("supports sticky headers in inverted mode", async () => {
    const items = [
      { id: "m0", label: "Newest", size: 30 },
      { id: "m1", label: "Message 1", size: 40 },
      { id: "h2", label: "Older Header", size: 30 },
      { id: "m3", label: "Oldest", size: 40 }
    ];

    render(
      <MeasuredVirtualList
        items={items}
        height={80}
        overscan={0}
        initialScrollOffset={45}
        inverted
        stickyIndexes={[0, 2]}
        estimatedItemSize={40}
        getItemKey={(item) => item.id}
        renderItem={(item) => (
          <div data-measured-size={item.size} style={{ height: `${item.size}px` }}>
            {item.label}
          </div>
        )}
      />
    );

    const sticky = await waitFor(() => {
      const overlay = document.querySelector("[data-sticky-index='2']");

      expect(overlay).not.toBeNull();

      return overlay;
    });

    expect(sticky).toHaveTextContent("Older Header");
  });
});
