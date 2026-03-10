import * as React from "react";

import {
  getScrollOffsetForIndex,
  type ScrollAlign,
  useVirtualList
} from "./useVirtualList";

export interface ScrollToOffsetOptions {
  offset: number;
  behavior?: ScrollBehavior;
}

export interface ScrollToBottomOptions {
  behavior?: ScrollBehavior;
}

export interface ScrollToIndexOptions {
  index: number;
  align?: ScrollAlign;
  behavior?: ScrollBehavior;
}

export interface VirtualListHandle {
  scrollToOffset: (options: ScrollToOffsetOptions) => void;
  scrollToBottom: (options?: ScrollToBottomOptions) => void;
  scrollToIndex: (options: ScrollToIndexOptions) => void;
  getScrollOffset: () => number;
  getScrollElement: () => HTMLDivElement | null;
}

export interface VirtualListProps<T> {
  items: readonly T[];
  height: number;
  itemHeight: number;
  overscan?: number;
  initialScrollOffset?: number;
  className?: string;
  style?: React.CSSProperties;
  innerStyle?: React.CSSProperties;
  itemStyle?: React.CSSProperties;
  getItemKey?: (item: T, index: number) => React.Key;
  renderItem: (item: T, index: number) => React.ReactNode;
  onScroll?: (
    scrollTop: number,
    event: React.UIEvent<HTMLDivElement>
  ) => void;
}

const viewportStyle: React.CSSProperties = {
  overflowY: "auto",
  position: "relative",
  width: "100%"
};

const innerStyle: React.CSSProperties = {
  position: "relative",
  width: "100%"
};

const rowStyle: React.CSSProperties = {
  left: 0,
  position: "absolute",
  width: "100%"
};

function VirtualListInner<T>(
  props: VirtualListProps<T>,
  forwardedRef: React.ForwardedRef<VirtualListHandle>
): React.ReactElement {
  const {
    items,
    height,
    itemHeight,
    overscan,
    initialScrollOffset = 0,
    className,
    style,
    innerStyle: customInnerStyle,
    itemStyle,
    getItemKey,
    renderItem,
    onScroll
  } = props;
  const scrollElementRef = React.useRef<HTMLDivElement | null>(null);
  const lastAppliedInitialScrollOffsetRef = React.useRef<number | null>(null);
  const [scrollTop, setScrollTop] = React.useState(() =>
    Math.max(0, initialScrollOffset)
  );
  const virtual = useVirtualList({
    itemCount: items.length,
    itemHeight,
    viewportHeight: height,
    scrollTop,
    overscan
  });
  const maxScrollTop = Math.max(0, virtual.totalHeight - height);

  const scrollToOffset = React.useCallback(
    (options: ScrollToOffsetOptions): void => {
      const nextOffset = Math.max(0, Math.min(options.offset, maxScrollTop));
      const scrollElement = scrollElementRef.current;

      setScrollTop(nextOffset);

      if (scrollElement) {
        scrollElement.scrollTo({
          top: nextOffset,
          behavior: options.behavior ?? "auto"
        });
      }
    },
    [maxScrollTop]
  );

  const scrollToBottom = React.useCallback(
    (options?: ScrollToBottomOptions): void => {
      scrollToOffset({
        offset: maxScrollTop,
        behavior: options?.behavior
      });
    },
    [maxScrollTop, scrollToOffset]
  );

  const scrollToIndex = React.useCallback(
    (options: ScrollToIndexOptions): void => {
      const nextOffset = getScrollOffsetForIndex({
        index: options.index,
        itemCount: items.length,
        itemHeight,
        viewportHeight: height,
        currentScrollTop: scrollTop,
        align: options.align
      });

      scrollToOffset({
        offset: nextOffset,
        behavior: options.behavior
      });
    },
    [height, itemHeight, items.length, scrollToOffset, scrollTop]
  );

  React.useImperativeHandle(
    forwardedRef,
    () => ({
      scrollToOffset,
      scrollToBottom,
      scrollToIndex,
      getScrollOffset: () => scrollTop,
      getScrollElement: () => scrollElementRef.current
    }),
    [scrollToBottom, scrollToIndex, scrollToOffset, scrollTop]
  );

  React.useEffect(() => {
    if (lastAppliedInitialScrollOffsetRef.current === initialScrollOffset) {
      return;
    }

    const scrollElement = scrollElementRef.current;
    const nextOffset = Math.max(0, Math.min(initialScrollOffset, maxScrollTop));

    if (!scrollElement) {
      return;
    }

    lastAppliedInitialScrollOffsetRef.current = initialScrollOffset;
    scrollElement.scrollTop = nextOffset;
    setScrollTop(nextOffset);
  }, [initialScrollOffset, maxScrollTop]);

  function handleScroll(event: React.UIEvent<HTMLDivElement>): void {
    const nextScrollTop = event.currentTarget.scrollTop;

    setScrollTop(nextScrollTop);
    onScroll?.(nextScrollTop, event);
  }

  return React.createElement(
    "div",
    {
      className,
      onScroll: handleScroll,
      ref: scrollElementRef,
      style: {
        ...viewportStyle,
        ...style,
        height
      }
    },
    React.createElement(
      "div",
      {
        style: {
          ...innerStyle,
          ...customInnerStyle,
          height: virtual.totalHeight
        }
      },
      virtual.items.map((virtualItem) => {
        const item = items[virtualItem.index];
        const key = getItemKey
          ? getItemKey(item, virtualItem.index)
          : virtualItem.index;

        return React.createElement(
          "div",
          {
            key,
            style: {
              ...rowStyle,
              ...itemStyle,
              height: virtualItem.size,
              transform: `translateY(${virtualItem.start}px)`
            }
          },
          renderItem(item, virtualItem.index)
        );
      })
    )
  );
}

export const VirtualList = React.forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & {
    ref?: React.Ref<VirtualListHandle>;
  }
) => React.ReactElement;
