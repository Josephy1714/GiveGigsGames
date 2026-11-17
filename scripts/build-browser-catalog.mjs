#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const catalogUrl = new URL("../games/catalog.json", import.meta.url);
const outputUrl = new URL("../games/catalog-data.js", import.meta.url);
const catalog = JSON.parse(await readFile(catalogUrl, "utf8"));
const output = `/* Generated from catalog.json by scripts/build-browser-catalog.mjs. */\nwindow.GIVEGIGSGAMES_CATALOG = ${JSON.stringify(catalog).replace(/</g, "\\u003c")};\n`;

if (process.argv.includes("--check")) {
  const existing = await readFile(outputUrl, "utf8").catch(() => "");
  if (existing !== output) {
    console.error("games/catalog-data.js is stale. Run node scripts/build-browser-catalog.mjs and commit the result.");
    process.exit(1);
  }
  console.log("Offline catalog data is current.");
} else {
  await writeFile(outputUrl, output, "utf8");
  console.log(`Wrote offline catalog data for ${catalog.games.length} titles.`);
}
