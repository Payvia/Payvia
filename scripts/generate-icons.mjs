// Renders the app icon set from the mark below: `node scripts/generate-icons.mjs`.
// Uses the Chromium that Playwright installs, so there is no image dependency.
// Change the mark or the colours here, run it again, and commit the output.

import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const brand = "#5500ff";
// A "P" drawn on a 512 canvas, centred.
const mark = "M184 376V136h76a68 68 0 0 1 0 136h-76";

function svg({ radius = 0, scale = 1 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${brand}"/>
  <path d="${mark}" fill="none" stroke="#fff" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"${
    scale === 1
      ? ""
      : ` transform="translate(256 256) scale(${scale}) translate(-256 -256)"`
  }/>
</svg>
`;
}

const rounded = svg({ radius: 112 });
const square = svg();
// Launchers crop maskable icons to a circle, so the mark stays well inside it.
const maskable = svg({ scale: 0.8 });

const browser = await chromium.launch();
const page = await browser.newPage();

async function png(source, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${source}`,
  );
  return page.screenshot({ omitBackground: true });
}

/** An .ico file is a small directory followed by ordinary PNGs. */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(size, entry);
    header.writeUInt8(size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

await mkdir("public/icons", { recursive: true });

await writeFile("src/app/icon.svg", rounded);
await writeFile("src/app/apple-icon.png", await png(square, 180));
await writeFile(
  "src/app/favicon.ico",
  ico([
    { size: 32, data: await png(rounded, 32) },
    { size: 48, data: await png(rounded, 48) },
  ]),
);
for (const size of [192, 512]) {
  await writeFile(`public/icons/icon-${size}.png`, await png(rounded, size));
  await writeFile(
    `public/icons/maskable-${size}.png`,
    await png(maskable, size),
  );
}

await browser.close();
