import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const releaseDir = join(root, "release");
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const files = (await readdir(releaseDir)).filter(file => file.endsWith(".exe")).sort();
if (!files.length) throw new Error("No Windows executables found in release/. Build the release first.");

const artifacts = [];
for (const file of files) {
  const fullPath = join(releaseDir, file);
  const buffer = await readFile(fullPath);
  artifacts.push({
    file,
    bytes: (await stat(fullPath)).size,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  });
}

const manifest = {
  product: pkg.build.productName,
  version: pkg.version,
  platform: "windows",
  architecture: "x64",
  generatedAt: new Date().toISOString(),
  artifacts,
};
await writeFile(join(releaseDir, "release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Recorded ${artifacts.length} Windows artifacts in release/release-manifest.json.`);
