import { spawn } from "node:child_process";
import path from "node:path";

import { printBundleSizeReport } from "./report-bundle-size.mjs";

function runTsup() {
  return new Promise((resolve, reject) => {
    const command = process.platform === "win32" ? "npx.cmd" : "npx";
    const child = spawn(command, ["tsup"], {
      cwd: process.cwd(),
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`tsup exited with code ${code ?? "unknown"}`));
    });
  });
}

try {
  await runTsup();
  console.log("");
  printBundleSizeReport({
    rootDir: process.cwd(),
    sourceFile: path.join("src", "index.ts"),
    bundleFile: path.join("dist", "index.js")
  });
} catch (error) {
  const message =
    error instanceof Error ? error.message : "unknown build error";

  console.error(message);
  process.exit(1);
}
