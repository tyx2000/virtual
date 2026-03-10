import * as React from "react";

import { getMeasuredScrollOffsetForIndex } from "./useMeasuredVirtualList";
import { MeasurementStore } from "./measurementStore";
import {
  type ScrollToBottomOptions,
  type ScrollToIndexOptions,
  type ScrollToOffsetOptions,
  type VirtualListHandle
} from "./VirtualList";

export interface MeasuredVirtualListProps<T> {
  items: readonly T[];
  height: number;
  overscan?: number;
  initialScrollOffset?: number;
  inverted?: boolean;
  anchorBottom?: boolean;
  followOutput?: boolean;
  bottomThreshold?: number;
  estimatedItemSize: number | ((item: T, index: number) => number);
  className?: string;
  style?: React.CSSProperties;
  innerStyle?: React.CSSProperties;
  itemStyle?: React.CSSProperties;
  stickyItemStyle?: React.CSSProperties;
  stickyIndexes?: readonly number[];
  getItemKey?: (item: T, index: number) => React.Key;
  renderItem: (item: T, index: number) => React.ReactNode;
  renderStickyItem?: (item: T, index: number) => React.ReactNode;
  onScroll?: (
    scrollTop: number,
    event: React.UIEvent<HTMLDivElement>
  ) => void;
}

interface MeasuredRowProps<T> {
  item: T;
  index: number;
  start: number;
  size: number;
  itemStyle?: React.CSSProperties;
  hidden?: boolean;
  observer: ResizeObserver | null;
  renderItem: (item: T, index: number) => React.ReactNode;
}

interface StickyState<T> {
  index: number;
  item: T;
  size: number;
  offset: number;
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

const stickyOverlayStyle: React.CSSProperties = {
  left: 0,
  position: "absolute",
  top: 0,
  width: "100%",
  zIndex: 2
};

function isNearBottom(
  scrollTop: number,
  totalHeight: number,
  viewportHeight: number,
  threshold: number
): boolean {
  const maxScrollTop = Math.max(0, totalHeight - viewportHeight);

  return maxScrollTop - scrollTop <= Math.max(0, threshold);
}

function MeasuredRow<T>(props: MeasuredRowProps<T>): React.ReactElement {
  const { item, index, start, size, itemStyle, hidden, observer, renderItem } =
    props;
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const node = contentRef.current;

    if (!node || !observer) {
      return;
    }

    node.dataset.index = String(index);
    observer.observe(node);

    return () => {
      observer.unobserve(node);
    };
  }, [index, observer]);

  return React.createElement(
    "div",
    {
      style: {
        ...rowStyle,
        ...itemStyle,
        height: size,
        visibility: hidden ? "hidden" : undefined,
        transform: `translateY(${start}px)`
      }
    },
    React.createElement(
      "div",
      {
        ref: contentRef
      },
      renderItem(item, index)
    )
  );
}

function MeasuredVirtualListInner<T>(
  props: MeasuredVirtualListProps<T>,
  forwardedRef: React.ForwardedRef<VirtualListHandle>
): React.ReactElement {
  const {
    items,
    height,
    overscan,
    initialScrollOffset = 0,
    inverted = false,
    anchorBottom = false,
    followOutput = false,
    bottomThreshold = 24,
    estimatedItemSize,
    className,
    style,
    innerStyle: customInnerStyle,
    itemStyle,
    stickyItemStyle,
    stickyIndexes,
    getItemKey,
    renderItem,
    renderStickyItem,
    onScroll
  } = props;
  const scrollElementRef = React.useRef<HTMLDivElement | null>(null);
  const scrollTopRef = React.useRef(Math.max(0, initialScrollOffset));
  const measuredSizesRef = React.useRef<Partial<Record<number, number>>>({});
  const lastAppliedInitialScrollOffsetRef = React.useRef<number | null>(null);
  const followOutputRef = React.useRef(followOutput);
  const bottomThresholdRef = React.useRef(bottomThreshold);
  const isAtBottomRef = React.useRef(false);
  const previousItemsLengthRef = React.useRef(items.length);
  const [scrollTop, setScrollTop] = React.useState(() =>
    Math.max(0, initialScrollOffset)
  );
  const [layoutVersion, setLayoutVersion] = React.useState(0);

  const resolveEstimatedItemSize = React.useCallback(
    (index: number): number => {
      const item = items[index];

      if (typeof estimatedItemSize === "function") {
        return estimatedItemSize(item, index);
      }

      return estimatedItemSize;
    },
    [estimatedItemSize, items]
  );
  const measurementStore = React.useMemo(
    () => new MeasurementStore(items.length, resolveEstimatedItemSize),
    [items.length, resolveEstimatedItemSize]
  );
  const measuredVirtual = React.useMemo(
    () => measurementStore.getRange(scrollTop, height, overscan ?? 2, inverted),
    [height, inverted, layoutVersion, measurementStore, overscan, scrollTop]
  );
  const maxScrollTop = Math.max(0, measuredVirtual.totalHeight - height);
  const contentOffset = anchorBottom
    ? Math.max(0, height - measuredVirtual.totalHeight)
    : 0;
  const didAppend = items.length > previousItemsLengthRef.current;
  const shouldFollowAppendedOutput =
    followOutputRef.current && didAppend && isAtBottomRef.current;
  const [observer, setObserver] = React.useState<ResizeObserver | null>(null);
  const stickyState = React.useMemo<StickyState<T> | null>(() => {
    if (!stickyIndexes || stickyIndexes.length === 0) {
      return null;
    }

    const totalHeight = measurementStore.getTotalHeight();
    const stickyCandidates = stickyIndexes
      .filter(
        (index) => Number.isInteger(index) && index >= 0 && index < items.length
      )
      .map((index) => {
        const size = measurementStore.getSize(index);
        const offset = measurementStore.getOffset(index);
        const start = inverted ? totalHeight - offset - size : offset;

        return {
          index,
          item: items[index],
          size,
          start
        };
      })
      .sort((left, right) => left.start - right.start);

    let activePosition = -1;

    for (let index = 0; index < stickyCandidates.length; index += 1) {
      if (stickyCandidates[index].start <= scrollTop) {
        activePosition = index;
        continue;
      }

      break;
    }

    if (activePosition === -1) {
      return null;
    }

    const activeSticky = stickyCandidates[activePosition];
    const nextSticky = stickyCandidates[activePosition + 1];
    let offset = 0;

    if (nextSticky) {
      const distanceToNext = nextSticky.start - scrollTop;

      if (distanceToNext < activeSticky.size) {
        offset = distanceToNext - activeSticky.size;
      }
    }

    return {
      index: activeSticky.index,
      item: activeSticky.item,
      size: activeSticky.size,
      offset
    };
  }, [inverted, items, layoutVersion, measurementStore, scrollTop, stickyIndexes]);

  const scrollToOffset = React.useCallback(
    (options: ScrollToOffsetOptions): void => {
      const nextOffset = Math.max(0, Math.min(options.offset, maxScrollTop));
      const scrollElement = scrollElementRef.current;

      scrollTopRef.current = nextOffset;
      isAtBottomRef.current = isNearBottom(
        nextOffset,
        measuredVirtual.totalHeight,
        height,
        bottomThresholdRef.current
      );
      setScrollTop(nextOffset);

      if (scrollElement) {
        scrollElement.scrollTo({
          top: nextOffset,
          behavior: options.behavior ?? "auto"
        });
      }
    },
    [height, maxScrollTop, measuredVirtual.totalHeight]
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
      const nextOffset = getMeasuredScrollOffsetForIndex({
        index: options.index,
        itemCount: items.length,
        viewportHeight: height,
        currentScrollTop: scrollTopRef.current,
        align: options.align,
        inverted,
        estimatedItemSize: resolveEstimatedItemSize,
        measuredSizes: measuredSizesRef.current
      });

      scrollToOffset({
        offset: nextOffset,
        behavior: options.behavior
      });
    },
    [height, inverted, items.length, resolveEstimatedItemSize, scrollToOffset]
  );

  React.useImperativeHandle(
    forwardedRef,
    () => ({
      scrollToOffset,
      scrollToBottom,
      scrollToIndex,
      getScrollOffset: () => scrollTopRef.current,
      getScrollElement: () => scrollElementRef.current
    }),
    [scrollToBottom, scrollToIndex, scrollToOffset]
  );

  React.useEffect(() => {
    measuredSizesRef.current = {};
    setLayoutVersion((version) => version + 1);
  }, [measurementStore]);

  React.useEffect(() => {
    followOutputRef.current = followOutput;
    bottomThresholdRef.current = bottomThreshold;
  }, [bottomThreshold, followOutput]);

  React.useEffect(() => {
    scrollTopRef.current = scrollTop;
    isAtBottomRef.current = isNearBottom(
      scrollTop,
      measuredVirtual.totalHeight,
      height,
      bottomThresholdRef.current
    );
  }, [height, measuredVirtual.totalHeight, scrollTop]);

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
    scrollTopRef.current = nextOffset;
    setScrollTop(nextOffset);
  }, [initialScrollOffset, maxScrollTop]);

  React.useEffect(() => {
    previousItemsLengthRef.current = items.length;

    if (!shouldFollowAppendedOutput) {
      return;
    }

    const scrollElement = scrollElementRef.current;

    scrollTopRef.current = maxScrollTop;
    isAtBottomRef.current = true;
    setScrollTop(maxScrollTop);

    if (scrollElement) {
      scrollElement.scrollTop = maxScrollTop;
    }
  }, [items.length, maxScrollTop, shouldFollowAppendedOutput]);

  React.useEffect(() => {
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      let hasChanges = false;
      let scrollAdjustment = 0;
      const wasAtBottom = isAtBottomRef.current;

      for (const entry of entries) {
        const node = entry.target as HTMLElement;
        const index = Number(node.dataset.index);

        if (!Number.isInteger(index) || index < 0 || index >= items.length) {
          continue;
        }

        const previousTotalHeight = measurementStore.getTotalHeight();
        const nextSize = Math.max(1, Math.ceil(entry.contentRect.height));
        const previousOffset = measurementStore.getOffset(index);
        const previousSize = measurementStore.getSize(index);
        const delta = measurementStore.setSize(index, nextSize);

        if (delta === 0) {
          continue;
        }

        hasChanges = true;
        measuredSizesRef.current = {
          ...measuredSizesRef.current,
          [index]: nextSize
        };

        const previousVisualStart = inverted
          ? previousTotalHeight - previousOffset - previousSize
          : previousOffset;
        const previousVisualEnd = previousVisualStart + previousSize;

        if (previousVisualEnd <= scrollTopRef.current) {
          scrollAdjustment += delta;
        }
      }

      if (!hasChanges) {
        return;
      }

      const nextMaxScrollTop = Math.max(
        0,
        measurementStore.getTotalHeight() - height
      );

      if (followOutputRef.current && wasAtBottom) {
        const scrollElement = scrollElementRef.current;

        scrollTopRef.current = nextMaxScrollTop;
        isAtBottomRef.current = true;
        setScrollTop(nextMaxScrollTop);

        if (scrollElement) {
          scrollElement.scrollTop = nextMaxScrollTop;
        }
      } else if (scrollAdjustment !== 0) {
        const nextScrollTop = Math.max(
          0,
          Math.min(scrollTopRef.current + scrollAdjustment, nextMaxScrollTop)
        );
        const scrollElement = scrollElementRef.current;

        scrollTopRef.current = nextScrollTop;
        setScrollTop(nextScrollTop);

        if (scrollElement) {
          scrollElement.scrollTop = nextScrollTop;
        }
      }

      setLayoutVersion((version) => version + 1);
    });

    setObserver(resizeObserver);

    return () => {
      resizeObserver.disconnect();
      setObserver(null);
    };
  }, [height, inverted, items.length, measurementStore]);

  function handleScroll(event: React.UIEvent<HTMLDivElement>): void {
    const nextScrollTop = event.currentTarget.scrollTop;

    scrollTopRef.current = nextScrollTop;
    isAtBottomRef.current = isNearBottom(
      nextScrollTop,
      measuredVirtual.totalHeight,
      height,
      bottomThresholdRef.current
    );
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
          height: Math.max(measuredVirtual.totalHeight, height)
        }
      },
      measuredVirtual.items.map((virtualItem) => {
        const item = items[virtualItem.index];
        const key = getItemKey
          ? getItemKey(item, virtualItem.index)
          : virtualItem.index;

        return React.createElement(
          MeasuredRow as React.ComponentType<MeasuredRowProps<T>>,
          {
            key,
            item,
            index: virtualItem.index,
            start: contentOffset + virtualItem.start,
            size: virtualItem.size,
            itemStyle,
            hidden: stickyState?.index === virtualItem.index,
            observer,
            renderItem
          }
        );
      }),
      stickyState
        ? React.createElement(
            "div",
            {
              "data-sticky-index": stickyState.index,
              style: {
                ...stickyOverlayStyle,
                ...stickyItemStyle,
                height: stickyState.size,
                transform: `translateY(${stickyState.offset}px)`
              }
            },
            (renderStickyItem ?? renderItem)(stickyState.item, stickyState.index)
          )
        : null
    )
  );
}

export const MeasuredVirtualList = React.forwardRef(
  MeasuredVirtualListInner
) as <T>(
  props: MeasuredVirtualListProps<T> & {
    ref?: React.Ref<VirtualListHandle>;
  }
) => React.ReactElement;
