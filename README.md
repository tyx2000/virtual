# react-virtual

一个面向 React 的轻量虚拟滚动 npm package，目前提供三条能力线：

- 固定高度列表
- 已知可变高度列表
- 动态测量型可变高度列表

这里的“已知可变高度”指的是每一项高度可以不同，但高度值需要通过 `getItemSize` 提前给出。

“动态测量型可变高度”则通过 `ResizeObserver` 在渲染后采集真实高度，并在前方项高度变化时修正滚动锚点，尽量避免视口内容跳动。

当前提供：

- 固定高度列表的 `useVirtualList` hook
- 已知可变高度列表的 `useVariableVirtualList` hook
- 动态测量型可变高度列表的 `useMeasuredVirtualList` hook
- 开箱即用的 `VirtualList` 基础组件
- 开箱即用的 `VariableVirtualList` 基础组件
- 开箱即用的 `MeasuredVirtualList` 基础组件
- `scrollToOffset` / `scrollToIndex` 的 ref 控制能力
- `MeasuredVirtualList` 的 sticky group / sticky header 能力
- TypeScript 类型声明
- `tsup` ESM 产物构建

## 设计目标

- 对 React 版本不过度设限，`peerDependencies.react` 仅要求 `>=16.8.0`
- 先把 package 结构、导出边界和最小 API 稳定下来
- 用足够清晰的实现验证虚拟滚动的核心抽象，再逐步扩展到更复杂场景
- 后续可继续扩展为 grid、更复杂的分组语义和更强的测量策略

## 开发

```bash
npm install
npm run check
npm run release:verify
npm run pack:check
npm test
```

`npm run check` 会顺序执行类型检查、测试和构建，适合作为本地提交前校验。

`npm run build` 会在构建完成后直接输出 `src/index.ts`、`dist/index.js`、gzip 和 brotli 的对齐体积报告。

`npm run release:verify` 会在发布前额外执行 npm 包名状态检测和打包清单检查。

`npm run pack:check` 会执行 `npm pack --dry-run`，用于确认最终发布到 npm 的文件集合是否符合预期。

仓库内的 [release.yml](/Users/adib/Desktop/practices/react-virtual/.github/workflows/release.yml) 统一负责校验和发布，但现在只支持手动触发。触发时需要选择要执行的分支；如果同时把 `publish` 打开，workflow 会在校验通过后继续检查 npm 包状态并使用 `secrets.NPM_TOKEN` 发布到 npm。

仓库内还提供了一个基础示例源码，位于 [examples/basic.tsx](/Users/adib/Desktop/practices/react-virtual/examples/basic.tsx)，里面同时演示了固定高度、已知可变高度、动态测量型可变高度、sticky 分组头，以及聊天流常见的底部跟随能力。

## 使用示例

### 固定高度列表

```tsx
import * as React from "react";
import { VirtualList, type VirtualListHandle } from "react-virtual";

const items = Array.from({ length: 10000 }, (_, index) => `Row ${index}`);

export function Demo() {
  const listRef = React.useRef<VirtualListHandle>(null);

  return (
    <>
      <button
        onClick={() =>
          listRef.current?.scrollToIndex({
            index: 500,
            align: "center",
            behavior: "smooth"
          })
        }
      >
        Scroll to row 500
      </button>
      <VirtualList
        ref={listRef}
        items={items}
        height={480}
        itemHeight={40}
        overscan={4}
        renderItem={(item, index) => (
          <div
            style={{
              alignItems: "center",
              borderBottom: "1px solid #e5e7eb",
              boxSizing: "border-box",
              display: "flex",
              height: "100%",
              padding: "0 12px"
            }}
          >
            {index}: {item}
          </div>
        )}
      />
    </>
  );
}
```

### 已知可变高度列表

```tsx
import * as React from "react";
import {
  VariableVirtualList,
  type VirtualListHandle
} from "react-virtual";

const items = Array.from({ length: 1000 }, (_, index) => ({
  id: index,
  label: `Row ${index}`,
  size: 32 + (index % 4) * 12
}));

export function VariableDemo() {
  const listRef = React.useRef<VirtualListHandle>(null);

  return (
    <VariableVirtualList
      ref={listRef}
      items={items}
      height={480}
      overscan={4}
      getItemKey={(item) => item.id}
      getItemSize={(item) => item.size}
      renderItem={(item) => <div>{item.label}</div>}
    />
  );
}
```

### 动态测量型可变高度列表

```tsx
import * as React from "react";
import {
  MeasuredVirtualList,
  type VirtualListHandle
} from "react-virtual";

const items = Array.from({ length: 1000 }, (_, index) => ({
  id: index,
  label: `Row ${index}`,
  actualHeight: 28 + (index % 5) * 18
}));

export function MeasuredDemo() {
  const listRef = React.useRef<VirtualListHandle>(null);

  return (
    <MeasuredVirtualList
      ref={listRef}
      items={items}
      height={480}
      overscan={4}
      estimatedItemSize={48}
      getItemKey={(item) => item.id}
      renderItem={(item) => (
        <div style={{ height: item.actualHeight }}>{item.label}</div>
      )}
    />
  );
}
```

### Sticky group / sticky header

```tsx
import * as React from "react";
import { MeasuredVirtualList } from "react-virtual";

const items = [
  { id: "h-a", kind: "header", label: "A", height: 36 },
  { id: "a-1", kind: "row", label: "Alice", height: 40 },
  { id: "a-2", kind: "row", label: "Ava", height: 52 },
  { id: "h-b", kind: "header", label: "B", height: 36 },
  { id: "b-1", kind: "row", label: "Ben", height: 44 }
] as const;

export function StickyDemo() {
  return (
    <MeasuredVirtualList
      items={items}
      height={320}
      estimatedItemSize={44}
      stickyIndexes={[0, 3]}
      renderStickyItem={(item) => (
        <div style={{ height: item.height, fontWeight: 700 }}>{item.label}</div>
      )}
      renderItem={(item) => (
        <div style={{ height: item.height }}>{item.label}</div>
      )}
    />
  );
}
```

### 真正 inverted 的聊天流列表

```tsx
import * as React from "react";
import {
  MeasuredVirtualList,
  type VirtualListHandle
} from "react-virtual";

const items = [
  { id: "m0", text: "Newest", height: 40 },
  { id: "m1", text: "Older", height: 52 },
  { id: "m2", text: "Oldest", height: 36 }
];

export function ChatDemo() {
  const listRef = React.useRef<VirtualListHandle>(null);

  return (
    <MeasuredVirtualList
      ref={listRef}
      items={items}
      height={320}
      inverted
      anchorBottom
      estimatedItemSize={44}
      getItemKey={(item) => item.id}
      renderItem={(item) => (
        <div style={{ height: item.height }}>{item.text}</div>
      )}
    />
  );
}
```

## API

### `useVirtualList(options)`

适用于固定高度列表计算。

```ts
interface UseVirtualListOptions {
  itemCount: number;
  itemHeight: number;
  viewportHeight: number;
  scrollTop: number;
  overscan?: number;
}
```

返回值包含：

- `items`: 当前需要渲染的虚拟项
- `totalHeight`: 整个列表的总高度
- `startIndex` / `endIndex`: 当前窗口对应的渲染区间
- `paddingTop` / `paddingBottom`: 当前渲染区间前后的占位高度

### `getScrollOffsetForIndex(options)`

用于把某个索引换算成需要滚动到的 `scrollTop`。

```ts
type ScrollAlign = "auto" | "start" | "center" | "end";

interface GetScrollOffsetForIndexOptions {
  index: number;
  itemCount: number;
  itemHeight: number;
  viewportHeight: number;
  currentScrollTop?: number;
  align?: ScrollAlign;
}
```

### `VirtualList`

适用于快速接入基础虚拟列表。

主要 props：

- `items`: 数据源
- `height`: 容器高度
- `itemHeight`: 单项固定高度
- `overscan`: 额外渲染的缓冲项数量
- `initialScrollOffset`: 初始滚动位置
- `renderItem`: 行渲染函数
- `getItemKey`: 自定义 key

### `VirtualList` ref

```ts
interface VirtualListHandle {
  scrollToOffset(options: {
    offset: number;
    behavior?: ScrollBehavior;
  }): void;
  scrollToBottom(options?: {
    behavior?: ScrollBehavior;
  }): void;
  scrollToIndex(options: {
    index: number;
    align?: "auto" | "start" | "center" | "end";
    behavior?: ScrollBehavior;
  }): void;
  getScrollOffset(): number;
  getScrollElement(): HTMLDivElement | null;
}
```

### `useVariableVirtualList(options)`

适用于高度已知但每项大小不同的列表。

```ts
interface UseVariableVirtualListOptions {
  itemCount: number;
  viewportHeight: number;
  scrollTop: number;
  overscan?: number;
  getItemSize: (index: number) => number;
}
```

### `getVariableScrollOffsetForIndex(options)`

用于把可变高度列表中的某个索引换算成需要滚动到的 `scrollTop`。

```ts
interface GetVariableScrollOffsetForIndexOptions {
  index: number;
  itemCount: number;
  viewportHeight: number;
  currentScrollTop?: number;
  align?: ScrollAlign;
  getItemSize: (index: number) => number;
}
```

### `VariableVirtualList`

适用于高度提前已知的 variable-size 列表。

主要 props：

- `items`: 数据源
- `height`: 容器高度
- `overscan`: 额外渲染的缓冲项数量
- `getItemSize`: 返回每一项高度
- `renderItem`: 行渲染函数
- `getItemKey`: 自定义 key

### `useMeasuredVirtualList(options)`

适用于初始只能估算高度、但渲染后会测量真实高度的列表。

```ts
interface UseMeasuredVirtualListOptions {
  itemCount: number;
  viewportHeight: number;
  scrollTop: number;
  overscan?: number;
  inverted?: boolean;
  estimatedItemSize: number | ((index: number) => number);
  measuredSizes?: Partial<Record<number, number>>;
}
```

### `getMeasuredScrollOffsetForIndex(options)`

用于把动态测量列表中的某个索引换算成需要滚动到的 `scrollTop`。

```ts
interface GetMeasuredScrollOffsetForIndexOptions {
  index: number;
  itemCount: number;
  viewportHeight: number;
  currentScrollTop?: number;
  align?: ScrollAlign;
  inverted?: boolean;
  estimatedItemSize: number | ((index: number) => number);
  measuredSizes?: Partial<Record<number, number>>;
}
```

### `MeasuredVirtualList`

适用于初始估算高度、渲染后测量真实高度的 variable-size 列表。

主要 props：

- `items`: 数据源
- `height`: 容器高度
- `overscan`: 额外渲染的缓冲项数量
- `estimatedItemSize`: 初始估算高度
- `inverted`: 启用真正的 inverted 视觉顺序，`index 0` 位于底部
- `anchorBottom`: 当内容高度小于视口时，从底部开始排布内容
- `followOutput`: 当用户当前贴底时，追加内容后继续自动贴底
- `bottomThreshold`: 判断“是否视为贴底”的阈值，默认 `24`
- `stickyIndexes`: 哪些索引应作为 sticky header/group 参与吸顶
- `stickyItemStyle`: sticky overlay 容器样式
- `renderStickyItem`: sticky overlay 的单独渲染函数，默认复用 `renderItem`
- `renderItem`: 行渲染函数
- `getItemKey`: 自定义 key

sticky 的行为规则是：

- 当前分组头会固定在顶部
- 下一组分组头接近顶部时，会把当前 sticky 头顶走
- `inverted` 模式下同样可用，但它依然是“吸顶”，不是吸底

### 聊天流场景

如果你在做聊天消息流或日志流，推荐在 `MeasuredVirtualList` 上开启：

```tsx
<MeasuredVirtualList
  anchorBottom
  followOutput
  bottomThreshold={24}
  estimatedItemSize={48}
  ...
/>
```

配合 `ref.current?.scrollToBottom()`，可以覆盖这两类常见行为：

- 内容较少时，消息从容器底部向上贴齐，而不是堆在顶部
- 用户当前停留在底部，新消息追加后继续贴底
- 底部附近项在真实测量后高度发生变化时，继续保持底部锚点

如果你希望“索引语义”本身就是 inverted 的，也就是：

- `index 0` 在视觉上位于底部
- 更大的 index 越靠上
- `scrollToIndex({ index: 0, align: "end" })` 会滚到最新消息

可以进一步开启：

```tsx
<MeasuredVirtualList
  inverted
  anchorBottom
  estimatedItemSize={44}
  ...
/>
```

这时更适合“消息数组本身按新到旧排序”的场景。

## 原理说明

### 1. 为什么需要虚拟滚动

普通列表会把所有数据一次性挂到 DOM 上。数据量一大，问题会非常明显：

- 首次渲染慢，因为创建了过多 DOM 节点
- 滚动卡顿，因为浏览器要维护庞大的布局树和绘制成本
- 内存占用高，因为屏幕外的节点其实也一直存在

虚拟滚动的核心思想很简单：用户看不到的行，就不要真的渲染。

例如一个高度为 `480px` 的容器、每项高度为 `40px`，屏幕里同一时刻最多只会看到 `12` 行左右。即使数据有 `10000` 条，也没必要渲染 `10000` 个 DOM 节点，只渲染“视口内 + 少量缓冲区”即可。

### 2. 固定高度列表的关键前提

这个版本只解决固定高度场景，也就是每一行高度都相同。

这个前提非常重要，因为它让每一项的位置都可以通过公式直接算出来，不需要真实测量 DOM：

```ts
itemTop = index * itemHeight
itemBottom = itemTop + itemHeight
totalHeight = itemCount * itemHeight
```

一旦高度固定，滚动区间和索引区间之间就可以常数时间互相换算，这是这个实现保持简单和稳定的根本原因。

### 2.1 已知可变高度列表和固定高度的差别

可变高度列表里，下面这个公式不再成立：

```ts
itemTop = index * itemHeight
```

因为第 `index` 项的起点，取决于它前面所有项的高度和：

```ts
itemTop = size[0] + size[1] + ... + size[index - 1]
```

所以实现上需要先构建一组前缀偏移量：

```ts
offsets[0] = 0
offsets[1] = size[0]
offsets[2] = size[0] + size[1]
```

这样才能做：

- `index -> offset`
- `scrollTop -> nearest index`

当前实现通过预先遍历一遍 `getItemSize` 来生成 `offsets` 和 `sizes`，再在此基础上做二分定位和区间计算，代码在 [src/useVariableVirtualList.ts](/Users/adib/Desktop/practices/react-virtual/src/useVariableVirtualList.ts)。

### 2.2 动态测量型可变高度列表的处理方式

动态测量列表和“已知可变高度”最大的差别是：真实高度在初次计算时并不知道。

所以当前实现采用两阶段策略：

1. 先用 `estimatedItemSize` 建立初始偏移表，保证列表可以立刻滚动和渲染。
2. 渲染后通过 `ResizeObserver` 获取真实高度，用真实值覆盖估算值，再重新计算偏移。

这意味着内部实际维护的是：

- 估算高度
- 已测量高度覆盖表
- 基于两者合成出来的最新 offsets/sizes

对应代码在 [src/useMeasuredVirtualList.ts](/Users/adib/Desktop/practices/react-virtual/src/useMeasuredVirtualList.ts) 和 [src/MeasuredVirtualList.ts](/Users/adib/Desktop/practices/react-virtual/src/MeasuredVirtualList.ts)。

在当前版本里，`MeasuredVirtualList` 内部还额外引入了一个增量 measurement store，底层使用 Fenwick Tree 维护前缀高度和。这样当某一项被重新测量时，只需要对该项对应的高度差做一次 `O(log n)` 更新，而不需要在组件层每次都全量重建整张 offsets 表。实现位于 [src/measurementStore.ts](/Users/adib/Desktop/practices/react-virtual/src/measurementStore.ts)。

### 3. 如何从滚动位置算出要渲染哪些项

滚动容器会不断产生 `scrollTop`。拿到它之后，就可以计算当前视口覆盖了哪些索引。

基础公式如下：

```ts
visibleStart = floor(scrollTop / itemHeight)
visibleEnd = ceil((scrollTop + viewportHeight) / itemHeight) - 1
```

含义分别是：

- `visibleStart`: 视口顶部命中的第一项
- `visibleEnd`: 视口底部命中的最后一项

但真实渲染时通常不会只渲染这几项，因为用户继续滚动时容易出现白屏闪动，所以需要 `overscan` 缓冲区：

```ts
startIndex = max(0, visibleStart - overscan)
endIndex = min(itemCount - 1, visibleEnd + overscan)
```

这就是 [src/useVirtualList.ts](/Users/adib/Desktop/practices/react-virtual/src/useVirtualList.ts) 的核心逻辑。最终渲染量取决于“当前可见项数 + overscan”，而不是总数据量。

对于已知可变高度列表，思路相同，但计算手段不同：

- 先通过二分查找找到 `scrollTop` 对应的起始项
- 再向后累加，直到覆盖整个视口
- 最后再加上 `overscan`

因此固定高度版本更偏公式换算，而可变高度版本更偏“前缀和 + 二分 + 局部扫描”。

动态测量版本则是在此基础上再多一层“估算值到真实值的收敛过程”。

当 `inverted` 开启时，同一套高度数据会按“反向视觉顺序”解释：

- 渲染顺序改成从高 index 到低 index
- `scrollTop` 对应的可视区间按 inverted 视觉顺序查找
- `scrollToIndex` 按 inverted 的视觉位置换算偏移量

对于 sticky group，当前实现会额外维护一个“活动 sticky 项”：

1. 先把 `stickyIndexes` 对应项转换成当前视觉顺序下的 `start` 坐标。
2. 找到“已经经过视口顶部”的最后一个 sticky 项，作为当前吸顶项。
3. 如果下一个 sticky 项已经进入当前 sticky 的高度范围内，就给当前 sticky 一个负向 `translateY`，形成典型的 push-off 效果。

这个实现保持了分组头逻辑和虚拟窗口逻辑的解耦：列表本体仍然只负责渲染当前窗口，sticky 头则作为一层额外 overlay 单独计算和渲染。

### 4. 为什么总高度仍然要保持正确

如果只渲染可见项，但不保留整个列表应有的滚动高度，滚动条长度就会错误，用户也无法滚到后面的数据。

所以虚拟列表通常会保留一个“总高度正确的内层容器”：

```ts
totalHeight = itemCount * itemHeight
```

外层容器负责滚动，内层容器负责撑开完整高度。这样浏览器会认为这里确实有一整个长列表，滚动条尺寸也是正确的。

### 5. 为什么渲染项使用绝对定位

当前实现里，真实渲染出来的行元素都放在一个 `position: relative` 的内层容器中，然后每一项用绝对定位摆到自己的理论位置：

```ts
style = {
  position: "absolute",
  width: "100%",
  transform: `translateY(${itemTop}px)`
}
```

这样做有两个目的：

- 不需要真的在 DOM 中插入前面那几千行占位节点
- 每个可见项都能被直接放到它在完整列表中的正确坐标

你可以把它理解成：DOM 里只保留少量真实节点，但这些节点“伪装”成自己位于完整长列表中的正确位置。

### 6. `scrollToIndex` 的原理

`scrollToIndex` 本质上不是直接滚到某个 DOM 节点，而是先把目标索引换算成应该滚动到的 `scrollTop`，再调用滚动容器的 `scrollTo`。

最基本的起始对齐：

```ts
offset = index * itemHeight
```

如果需要不同对齐方式：

```ts
start  => itemStart
end    => itemEnd - viewportHeight
center => itemStart - (viewportHeight - itemHeight) / 2
```

`auto` 则更像“尽量少滚动”：

- 如果目标项已经完全在视口里，不滚动
- 如果目标项在视口上方，滚到该项顶部
- 如果目标项在视口下方，滚到该项底部刚好进入视口

对应逻辑在 [src/useVirtualList.ts](/Users/adib/Desktop/practices/react-virtual/src/useVirtualList.ts) 和 [src/VirtualList.ts](/Users/adib/Desktop/practices/react-virtual/src/VirtualList.ts) 中。

### 7. 这个实现的时间复杂度

在固定高度前提下：

- 区间计算是 `O(1)`
- 渲染项生成是 `O(k)`

这里的 `k` 是“当前渲染项数量”，大约等于：

```ts
k ~= ceil(viewportHeight / itemHeight) + overscan * 2
```

关键点在于，`k` 与 `itemCount` 无关。即使总数据是十万条，只要视口能看到的数量没变，单次渲染压力就大体稳定。

对于已知可变高度版本：

- 测量表构建是 `O(n)`
- 起始索引定位是 `O(log n)`
- 渲染项生成是 `O(k)`

这意味着它已经能支持 variable-size 场景，但还不是“超大规模动态测量列表”的最终形态。真正追求极致性能时，通常会继续引入增量缓存，而不是每次都完整重建偏移表。

动态测量版本会在“前方项高度变化”时做滚动锚点修正，也就是把变化量同步加回 `scrollTop`，尽量保持用户眼前内容不跳。这个逻辑在 [src/MeasuredVirtualList.ts](/Users/adib/Desktop/practices/react-virtual/src/MeasuredVirtualList.ts) 中实现。

为了降低动态测量阶段的更新成本，组件内部现在使用：

- Fenwick Tree 维护前缀和
- 单项高度差增量更新
- `scrollTop -> index` 的对数级查找

所以组件层的热路径已经从“每次测量变化都完整重建偏移表”推进到了“更新和定位都尽量走增量结构”。

### 8. 当前动态测量方案的边界

虽然已经支持动态测量，但当前实现仍然是基础版，主要边界包括：

- `MeasuredVirtualList` 内部已用增量树结构，但基础 hook 仍然保持直观实现
- 依赖 `ResizeObserver`
- 已支持正向列表、sticky group、底部跟随和真正的 inverted 视觉顺序
- `anchorBottom` 解决的是“底部布局”；`inverted` 解决的是“索引语义反转”
- sticky 目前是单列 overlay 方案，还没有做嵌套分组、横向滚动或多列布局协调

### 9. 当前实现的边界与约束

这个版本适合：

- 大量数据
- 固定行高
- 高度提前已知的可变高度列表
- 单列列表
- 需要基础滚动控制

当前还不覆盖：

- 多列 grid 虚拟化
- 服务端渲染下的复杂首屏同步策略
- 项级别测量与回收策略
- 更复杂的 sticky 分层、嵌套 group 和 section tree

### 10. 代码结构

- [src/useVirtualList.ts](/Users/adib/Desktop/practices/react-virtual/src/useVirtualList.ts): 负责区间计算和索引到偏移量的换算
- [src/useVariableVirtualList.ts](/Users/adib/Desktop/practices/react-virtual/src/useVariableVirtualList.ts): 负责已知可变高度列表的偏移量与渲染区间计算
- [src/useMeasuredVirtualList.ts](/Users/adib/Desktop/practices/react-virtual/src/useMeasuredVirtualList.ts): 负责动态测量列表的估算高度、已测高度覆盖和区间计算
- [src/measurementStore.ts](/Users/adib/Desktop/practices/react-virtual/src/measurementStore.ts): 负责动态测量组件内部的 Fenwick Tree 和增量前缀和维护
- [src/VirtualList.ts](/Users/adib/Desktop/practices/react-virtual/src/VirtualList.ts): 负责滚动容器、绝对定位渲染、ref 控制方法
- [src/VariableVirtualList.ts](/Users/adib/Desktop/practices/react-virtual/src/VariableVirtualList.ts): 负责已知可变高度列表组件
- [src/MeasuredVirtualList.ts](/Users/adib/Desktop/practices/react-virtual/src/MeasuredVirtualList.ts): 负责动态测量、`ResizeObserver` 接入、sticky overlay 和锚点修正
- [src/index.ts](/Users/adib/Desktop/practices/react-virtual/src/index.ts): 对外导出边界

## 后续演进建议

- 动态测量型可变高度的增量缓存和数据结构优化
- grid 虚拟化
- benchmark、真实 playground 和文档站点
