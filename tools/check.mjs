import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const files = [
  ...readdirSync(join(root, "desktop"), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith(".cjs"))
    .map(entry => join(root, "desktop", entry.name)),
  ...readdirSync(join(root, "js"), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith(".js"))
    .map(entry => join(root, "js", entry.name)),
];

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`Syntax checked ${files.length} source files.`);
