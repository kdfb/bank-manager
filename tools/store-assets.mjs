import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const storeDir = join(root, "assets", "store");
const masterPath = join(storeDir, "key-art-master.png");
const iconPath = join(root, "assets", "release", "app-icon.png");

const outputs = [
  { file: "store-header.jpg", width: 920, height: 430, logo: "horizontal", format: "jpeg" },
  { file: "store-small.jpg", width: 462, height: 174, logo: "compact", format: "jpeg" },
  { file: "store-main.jpg", width: 1232, height: 706, logo: "horizontal", format: "jpeg" },
  { file: "store-vertical.jpg", width: 748, height: 896, logo: "vertical", format: "jpeg" },
  { file: "library-capsule.jpg", width: 600, height: 900, logo: "vertical", format: "jpeg" },
  { file: "library-header.jpg", width: 920, height: 430, logo: "horizontal", format: "jpeg" },
];

function logoSvg(width, height, variant = "horizontal", transparent = false) {
  const vertical = variant === "vertical";
  const compact = variant === "compact";
  const titleWidth = vertical ? width * 0.84 : compact ? width * 0.72 : width * 0.52;
  const x = vertical ? width / 2 : compact ? width * 0.38 : width * 0.28;
  const y = vertical ? height * 0.16 : compact ? height * 0.31 : height * 0.22;
  const bankSize = vertical ? width * 0.115 : compact ? height * 0.25 : height * 0.19;
  const managerSize = vertical ? width * 0.145 : compact ? height * 0.31 : height * 0.145;
  const ruleY = y + bankSize * 0.26;
  const opacity = transparent ? 0 : 0.82;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="180%"><feGaussianBlur in="SourceAlpha" stdDeviation="${Math.max(2, width / 360)}"/><feOffset dy="${Math.max(2, height / 180)}"/><feComponentTransfer><feFuncA type="linear" slope=".9"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <linearGradient id="veil" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#160d08" stop-opacity="${opacity}"/><stop offset=".72" stop-color="#160d08" stop-opacity="${opacity * 0.12}"/><stop offset="1" stop-color="#160d08" stop-opacity="0"/></linearGradient>
    </defs>
    ${transparent ? "" : `<rect width="${width}" height="${height}" fill="url(#veil)"/>`}
    <g filter="url(#shadow)" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700">
      <text x="${x}" y="${y}" fill="#f5dfb6" stroke="#2a160b" stroke-width="${Math.max(1.4, width / 500)}" paint-order="stroke" font-size="${bankSize}" letter-spacing="${bankSize * 0.16}">BANK</text>
      <path d="M ${x - titleWidth / 2} ${ruleY} H ${x - bankSize * 0.42} M ${x + bankSize * 0.42} ${ruleY} H ${x + titleWidth / 2}" stroke="#e0b75f" stroke-width="${Math.max(2, height / 260)}"/>
      <path d="M ${x} ${ruleY - bankSize * 0.10} l ${bankSize * 0.12} ${bankSize * 0.10} l -${bankSize * 0.12} ${bankSize * 0.10} l -${bankSize * 0.12} -${bankSize * 0.10} z" fill="#e0b75f" stroke="#2a160b" stroke-width="${Math.max(1, width / 850)}"/>
      <text x="${x}" y="${y + managerSize * 0.82}" fill="#e0b75f" stroke="#2a160b" stroke-width="${Math.max(1.6, width / 470)}" paint-order="stroke" font-size="${managerSize}" letter-spacing="${managerSize * 0.045}">MANAGER</text>
    </g>
  </svg>`);
}

function overlaySvg(width, height, strength = 0.32) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#160d08" stop-opacity="${strength}"/><stop offset=".45" stop-color="#160d08" stop-opacity="0"/><stop offset="1" stop-color="#160d08" stop-opacity=".24"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
}

async function writeCapsule(spec) {
  const image = sharp(masterPath)
    .resize(spec.width, spec.height, { fit: "cover", position: sharp.strategy.attention })
    .modulate({ saturation: 0.94, brightness: 0.88 })
    .composite([
      { input: overlaySvg(spec.width, spec.height), blend: "over" },
      { input: logoSvg(spec.width, spec.height, spec.logo), blend: "over" },
    ]);
  if (spec.format === "png") await image.png({ compressionLevel: 9 }).toFile(join(storeDir, spec.file));
  else await image.jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toFile(join(storeDir, spec.file));
}

async function digest(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

await mkdir(storeDir, { recursive: true });
const master = await sharp(masterPath).metadata();
if (!master.width || !master.height || master.width < 1200 || master.height < 1200) {
  throw new Error("Store key-art master must be at least 1200×1200.");
}

for (const output of outputs) await writeCapsule(output);

await sharp(masterPath)
  .resize(1438, 810, { fit: "cover", position: sharp.strategy.attention })
  .modulate({ brightness: 0.48, saturation: 0.58 })
  .blur(1.2)
  .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
  .toFile(join(storeDir, "page-background.jpg"));

await sharp(masterPath)
  .resize(3840, 1240, { fit: "cover", position: sharp.strategy.attention })
  .modulate({ brightness: 0.78, saturation: 0.9 })
  .composite([{ input: overlaySvg(3840, 1240, 0.12), blend: "over" }])
  .png({ compressionLevel: 9 })
  .toFile(join(storeDir, "library-hero.png"));

await sharp(logoSvg(1280, 720, "horizontal", true))
  .png({ compressionLevel: 9 })
  .toFile(join(storeDir, "library-logo.png"));

await sharp(iconPath).resize(256, 256, { fit: "cover" }).png({ compressionLevel: 9 }).toFile(join(storeDir, "shortcut-icon.png"));
await sharp(iconPath).resize(184, 184, { fit: "cover" }).flatten({ background: "#2b1b12" }).jpeg({ quality: 94 }).toFile(join(storeDir, "app-icon.jpg"));

const deliverables = [
  ...outputs.map(({ file, width, height }) => ({ file, width, height })),
  { file: "page-background.jpg", width: 1438, height: 810 },
  { file: "library-hero.png", width: 3840, height: 1240 },
  { file: "library-logo.png", width: 1280, height: 720 },
  { file: "shortcut-icon.png", width: 256, height: 256 },
  { file: "app-icon.jpg", width: 184, height: 184 },
];
for (const item of deliverables) item.sha256 = await digest(join(storeDir, item.file));

const manifest = {
  source: "key-art-master.png",
  sourceDimensions: { width: master.width, height: master.height },
  specification: "Steamworks graphical assets dimensions current July 2026",
  rules: "https://partner.steamgames.com/doc/store/assets/rules",
  deliverables,
};
await writeFile(join(storeDir, "store-assets.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated ${deliverables.length} Steam-ready assets from ${manifest.source}.`);
