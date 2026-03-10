import * as React from "react";

import {
  getVariableScrollOffsetForIndex,
  useVariableVirtualList
} from "./useVariableVirtualList";
import {
  type ScrollToBottomOptions,
  type ScrollToIndexOptions,
  type ScrollToOffsetOptions,
  type VirtualListHandle
} from "./VirtualList";

export interface VariableVirtualListProps<T> {
  items: readonly T[];
  height: number;
  overscan?: number;
  initialScrollOffset?: number;
  className?: string;
  style?: React.CSSProperties;
  innerStyle?: React.CSSProperties;
  itemStyle?: React.CSSProperties;
  getItemSize: (item: T, index: number) => number;
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

function VariableVirtualListInner<T>(
  props: VariableVirtualListProps<T>,
  forwardedRef: React.ForwardedRef<VirtualListHandle>
): React.ReactElement {
  const {
    items,
    height,
    overscan,
    initialScrollOffset = 0,
    className,
    style,
    innerStyle: customInnerStyle,
    itemStyle,
    getItemSize,
    getItemKey,
    renderItem,
    onScroll
  } = props;
  const scrollElementRef = React.useRef<HTMLDivElement | null>(null);
  const lastAppliedInitialScrollOffsetRef = React.useRef<number | null>(null);
  const [scrollTop, setScrollTop] = React.useState(() =>
    Math.max(0, initialScrollOffset)
  );
  const virtual = useVariableVirtualList({
    itemCount: items.length,
    viewportHeight: height,
    scrollTop,
    overscan,
    getItemSize: (index) => getItemSize(items[index], index)
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
      const nextOffset = getVariableScrollOffsetForIndex({
        index: options.index,
        itemCount: items.length,
        viewportHeight: height,
        currentScrollTop: scrollTop,
        align: options.align,
        getItemSize: (index) => getItemSize(items[index], index)
      });

      scrollToOffset({
        offset: nextOffset,
        behavior: options.behavior
      });
    },
    [getItemSize, height, items, scrollToOffset, scrollTop]
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

export const VariableVirtualList = React.forwardRef(
  VariableVirtualListInner
) as <T>(
  props: VariableVirtualListProps<T> & {
    ref?: React.Ref<VirtualListHandle>;
  }
) => React.ReactElement;
