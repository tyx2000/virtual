import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const packageJsonPath = path.join(rootDir, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const packageName = packageJson.name;
const packageVersion = packageJson.version;
const strictNameCheck = process.env.STRICT_NPM_NAME_CHECK === "true";
const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;

function renderTable(rows) {
  const headers = ["Field", "Value"];
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
          : String(value).padEnd(widths[index], " ")
      )
      .join("  ");
  const separator = widths.map((width) => "-".repeat(width)).join("  ");

  return [renderRow(headers), separator, ...rows.map(renderRow)].join("\n");
}

function writeSummary(content) {
  if (!process.env.GITHUB_STEP_SUMMARY) {
    return;
  }

  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## npm Publish Check\n\n\`\`\`text\n${content}\n\`\`\`\n`
  );
}

let nameStatus = "unknown";
let versionStatus = "unknown";
let readiness = "checking registry";
let exitCode = 0;

try {
  const response = await fetch(registryUrl, {
    headers: {
      Accept: "application/json"
    }
  });

  if (response.status === 404) {
    nameStatus = "available";
    versionStatus = "unpublished";
    readiness = "ready to publish";
  } else if (response.ok) {
    const metadata = await response.json();
    const versionExists = Boolean(metadata.versions?.[packageVersion]);

    nameStatus = "taken";
    versionStatus = versionExists ? "already published" : "unpublished";

    if (versionExists) {
      readiness = "blocked: version already exists";
      exitCode = 1;
    } else if (strictNameCheck) {
      readiness = "blocked: name is already taken";
      exitCode = 1;
    } else {
      readiness = "continue only if token owns package";
    }
  } else {
    readiness = `blocked: registry returned ${response.status}`;
    exitCode = 1;
  }
} catch (error) {
  const message =
    error instanceof Error ? error.message : "unknown registry error";

  nameStatus = "unknown";
  versionStatus = "unknown";
  readiness = `blocked: ${message}`;
  exitCode = 1;
}

const table = renderTable([
  ["Package", packageName],
  ["Version", packageVersion],
  ["Name status", nameStatus],
  ["Version status", versionStatus],
  ["Strict check", strictNameCheck ? "enabled" : "disabled"],
  ["Publish readiness", readiness],
  ["Registry", registryUrl]
]);

console.log("npm Publish Check");
console.log(table);
writeSummary(table);

process.exit(exitCode);
