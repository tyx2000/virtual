import { appendFileSync, readFileSync } from "node:fs";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import path from "node:path";
import { pathToFileURL } from "node:url";

function readBuffer(filePath) {
  try {
    return readFileSync(filePath);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "unknown read error";

    console.error(`Failed to read ${filePath}: ${message}`);
    process.exit(1);
  }
}

function formatBytes(bytes) {
  return bytes.toLocaleString("en-US");
}

function formatKiB(bytes) {
  return (bytes / 1024).toFixed(2);
}

function formatDelta(current, base) {
  if (base === 0) {
    return "-";
  }

  const delta = ((current - base) / base) * 100;
  const sign = delta > 0 ? "+" : "";

  return `${sign}${delta.toFixed(1)}%`;
}

function renderTable(rows) {
  const headers = ["Artifact", "Bytes", "KiB", "Change"];
  const widths = headers.map((header, index) =>
    Math.max(
      header.length,
      ...rows.map((row) => String(row[index]).length)
    )
  );
  const renderRow = (row) =>
    row
      .map((value, index) =>
        index === 0
          ? String(value).padEnd(widths[index], " ")
          : String(value).padStart(widths[index], " ")
      )
      .join("  ");
  const separator = widths.map((width) => "-".repeat(width)).join("  ");

  return [renderRow(headers), separator, ...rows.map(renderRow)].join("\n");
}

export function getBundleSizeReport(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const sourceFile = options.sourceFile ?? path.join("src", "index.ts");
  const bundleFile = options.bundleFile ?? path.join("dist", "index.js");
  const sourcePath = path.join(rootDir, sourceFile);
  const bundlePath = path.join(rootDir, bundleFile);
  const sourceBuffer = readBuffer(sourcePath);
  const bundleBuffer = readBuffer(bundlePath);
  const gzipBuffer = gzipSync(bundleBuffer, { level: 9 });
  const brotliBuffer = brotliCompressSync(bundleBuffer, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11
    }
  });
  const rows = [
    [
      sourceFile,
      formatBytes(sourceBuffer.byteLength),
      formatKiB(sourceBuffer.byteLength),
      "-"
    ],
    [
      bundleFile,
      formatBytes(bundleBuffer.byteLength),
      formatKiB(bundleBuffer.byteLength),
      `${formatDelta(bundleBuffer.byteLength, sourceBuffer.byteLength)} vs source`
    ],
    [
      `${bundleFile} (gzip)`,
      formatBytes(gzipBuffer.byteLength),
      formatKiB(gzipBuffer.byteLength),
      `${formatDelta(gzipBuffer.byteLength, bundleBuffer.byteLength)} vs bundle`
    ],
    [
      `${bundleFile} (brotli)`,
      formatBytes(brotliBuffer.byteLength),
      formatKiB(brotliBuffer.byteLength),
      `${formatDelta(brotliBuffer.byteLength, bundleBuffer.byteLength)} vs bundle`
    ]
  ];

  return renderTable(rows);
}

export function printBundleSizeReport(options = {}) {
  const table = getBundleSizeReport(options);

  console.log("Bundle Size Report");
  console.log(table);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    const summaryBlock = `## Bundle Size Report\n\n\`\`\`text\n${table}\n\`\`\`\n`;

    try {
      appendFileSync(summaryPath, summaryBlock);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown summary write error";

      console.warn(`Failed to write bundle summary: ${message}`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  printBundleSizeReport();
}
