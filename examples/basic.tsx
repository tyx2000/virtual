import * as React from "react";

import {
  MeasuredVirtualList,
  VariableVirtualList,
  VirtualList,
  type VirtualListHandle
} from "../src";

const rows = Array.from({ length: 10000 }, (_, index) => ({
  id: `row-${index}`,
  label: `Row ${index}`
}));

export function BasicExample(): React.ReactElement {
  const listRef = React.useRef<VirtualListHandle>(null);
  const variableListRef = React.useRef<VirtualListHandle>(null);
  const measuredListRef = React.useRef<VirtualListHandle>(null);
  const invertedMeasuredListRef = React.useRef<VirtualListHandle>(null);
  const variableRows = React.useMemo(
    () =>
      Array.from({ length: 2000 }, (_, index) => ({
        id: `variable-row-${index}`,
        label: `Variable Row ${index}`,
        size: 32 + (index % 4) * 12
      })),
    []
  );
  const measuredRows = React.useMemo(
    () =>
      Array.from({ length: 2000 }, (_, index) => ({
        id: `measured-row-${index}`,
        label: `Measured Row ${index}`,
        size: 28 + (index % 5) * 18
      })),
    []
  );
  const stickyMeasuredRows = React.useMemo(() => {
    const groups = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];

    return groups.flatMap((group, groupIndex) => [
      {
        id: `group-${group}`,
        kind: "header" as const,
        label: `${group} Group`,
        size: 36
      },
      ...Array.from({ length: 12 }, (_, itemIndex) => ({
        id: `group-${group}-row-${itemIndex}`,
        kind: "row" as const,
        label: `${group} Item ${itemIndex}`,
        size: 28 + ((groupIndex + itemIndex) % 4) * 10
      }))
    ]);
  }, []);
  const stickyIndexes = React.useMemo(
    () =>
      stickyMeasuredRows.flatMap((item, index) =>
        item.kind === "header" ? [index] : []
      ),
    [stickyMeasuredRows]
  );
  const invertedMeasuredRows = React.useMemo(
    () =>
      Array.from({ length: 120 }, (_, index) => ({
        id: `chat-row-${index}`,
        label: `Chat Message ${index}`,
        size: 28 + (index % 4) * 12
      })),
    []
  );

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        margin: "40px auto",
        maxWidth: 720
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() =>
            listRef.current?.scrollToIndex({
              index: 0,
              align: "start",
              behavior: "smooth"
            })
          }
        >
          First row
        </button>
        <button
          onClick={() =>
            listRef.current?.scrollToIndex({
              index: 5000,
              align: "center",
              behavior: "smooth"
            })
          }
        >
          Middle row
        </button>
        <button
          onClick={() =>
            listRef.current?.scrollToIndex({
              index: rows.length - 1,
              align: "end",
              behavior: "smooth"
            })
          }
        >
          Last row
        </button>
      </div>

      <VirtualList
        ref={listRef}
        items={rows}
        height={480}
        itemHeight={48}
        overscan={5}
        getItemKey={(item) => item.id}
        style={{
          border: "1px solid #d1d5db",
          borderRadius: 12
        }}
        itemStyle={{
          borderBottom: "1px solid #f3f4f6"
        }}
        renderItem={(item, index) => (
          <div
            style={{
              alignItems: "center",
              background: index % 2 === 0 ? "#ffffff" : "#f9fafb",
              boxSizing: "border-box",
              display: "flex",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              height: "100%",
              padding: "0 16px"
            }}
          >
            {item.label}
          </div>
        )}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() =>
            variableListRef.current?.scrollToIndex({
              index: 1200,
              align: "center",
              behavior: "smooth"
            })
          }
        >
          Variable row 1200
        </button>
      </div>

      <VariableVirtualList
        ref={variableListRef}
        items={variableRows}
        height={360}
        overscan={4}
        getItemKey={(item) => item.id}
        getItemSize={(item) => item.size}
        style={{
          border: "1px solid #d1d5db",
          borderRadius: 12
        }}
        itemStyle={{
          borderBottom: "1px solid #f3f4f6"
        }}
        renderItem={(item, index) => (
          <div
            style={{
              alignItems: "center",
              background: index % 2 === 0 ? "#fff7ed" : "#fffbeb",
              boxSizing: "border-box",
              display: "flex",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              height: "100%",
              padding: "0 16px"
            }}
          >
            {item.label} ({item.size}px)
          </div>
        )}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() =>
            measuredListRef.current?.scrollToIndex({
              index: 1200,
              align: "center",
              behavior: "smooth"
            })
          }
        >
          Measured row 1200
        </button>
        <button
          onClick={() =>
            measuredListRef.current?.scrollToBottom({
              behavior: "smooth"
            })
          }
        >
          Stick bottom
        </button>
      </div>

      <MeasuredVirtualList
        ref={measuredListRef}
        items={measuredRows}
        height={360}
        overscan={4}
        anchorBottom
        followOutput
        estimatedItemSize={48}
        getItemKey={(item) => item.id}
        style={{
          border: "1px solid #d1d5db",
          borderRadius: 12
        }}
        itemStyle={{
          borderBottom: "1px solid #f3f4f6"
        }}
        renderItem={(item, index) => (
          <div
            style={{
              alignItems: "center",
              background: index % 2 === 0 ? "#eff6ff" : "#f8fafc",
              boxSizing: "border-box",
              display: "flex",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              height: item.size,
              padding: "0 16px"
            }}
          >
            {item.label} ({item.size}px actual)
          </div>
        )}
      />

      <MeasuredVirtualList
        items={stickyMeasuredRows}
        height={320}
        overscan={3}
        stickyIndexes={stickyIndexes}
        stickyItemStyle={{
          background: "#111827",
          color: "#f9fafb"
        }}
        estimatedItemSize={42}
        getItemKey={(item) => item.id}
        style={{
          border: "1px solid #d1d5db",
          borderRadius: 12
        }}
        itemStyle={{
          borderBottom: "1px solid #e5e7eb"
        }}
        renderStickyItem={(item) => (
          <div
            style={{
              alignItems: "center",
              boxSizing: "border-box",
              display: "flex",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontWeight: 700,
              height: item.size,
              padding: "0 16px"
            }}
          >
            {item.label}
          </div>
        )}
        renderItem={(item, index) => (
          <div
            style={{
              alignItems: "center",
              background:
                item.kind === "header"
                  ? "#e0f2fe"
                  : index % 2 === 0
                    ? "#f8fafc"
                    : "#ffffff",
              boxSizing: "border-box",
              display: "flex",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontWeight: item.kind === "header" ? 700 : 400,
              height: item.size,
              padding: "0 16px"
            }}
          >
            {item.label}
          </div>
        )}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() =>
            invertedMeasuredListRef.current?.scrollToIndex({
              index: 0,
              align: "end",
              behavior: "smooth"
            })
          }
        >
          Newest message
        </button>
        <button
          onClick={() =>
            invertedMeasuredListRef.current?.scrollToIndex({
              index: invertedMeasuredRows.length - 1,
              align: "start",
              behavior: "smooth"
            })
          }
        >
          Oldest message
        </button>
      </div>

      <MeasuredVirtualList
        ref={invertedMeasuredListRef}
        items={invertedMeasuredRows}
        height={320}
        overscan={4}
        inverted
        anchorBottom
        estimatedItemSize={40}
        getItemKey={(item) => item.id}
        style={{
          border: "1px solid #d1d5db",
          borderRadius: 12
        }}
        itemStyle={{
          borderBottom: "1px solid #e5e7eb"
        }}
        renderItem={(item, index) => (
          <div
            style={{
              alignItems: "center",
              background: index % 2 === 0 ? "#f5f3ff" : "#eef2ff",
              boxSizing: "border-box",
              display: "flex",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              height: item.size,
              padding: "0 16px"
            }}
          >
            {item.label} ({item.size}px)
          </div>
        )}
      />
    </div>
  );
}
