import "@testing-library/jest-dom/vitest";

Object.defineProperty(HTMLElement.prototype, "scrollTo", {
  configurable: true,
  value(options: ScrollToOptions | number, y?: number) {
    if (typeof options === "number") {
      this.scrollTop = y ?? 0;
      return;
    }

    this.scrollTop = options.top ?? this.scrollTop;
  }
});

function readElementHeight(element: Element): number {
  if (!(element instanceof HTMLElement)) {
    return 0;
  }

  const ownMeasuredHeight = element.dataset.measuredSize;

  if (ownMeasuredHeight) {
    return Number(ownMeasuredHeight);
  }

  const firstChild = element.firstElementChild;

  if (firstChild instanceof HTMLElement) {
    if (firstChild.dataset.measuredSize) {
      return Number(firstChild.dataset.measuredSize);
    }

    if (firstChild.style.height) {
      return Number.parseFloat(firstChild.style.height);
    }
  }

  if (element.style.height) {
    return Number.parseFloat(element.style.height);
  }

  return 0;
}

class MockResizeObserver implements ResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}

  disconnect(): void {}

  observe(target: Element): void {
    const height = readElementHeight(target);

    this.callback(
      [
        {
          borderBoxSize: [] as ResizeObserverSize[],
          contentBoxSize: [] as ResizeObserverSize[],
          contentRect: {
            bottom: height,
            height,
            left: 0,
            right: 0,
            top: 0,
            width: 0,
            x: 0,
            y: 0,
            toJSON: () => ({})
          },
          devicePixelContentBoxSize: [] as ResizeObserverSize[],
          target
        }
      ] as ResizeObserverEntry[],
      this
    );
  }

  unobserve(): void {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  value: MockResizeObserver
});
