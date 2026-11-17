#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gamesRoot = path.join(repoRoot, "games");
const catalog = JSON.parse(await (await import("node:fs/promises")).readFile(path.join(gamesRoot, "catalog.json"), "utf8"));
const rootAbsoluteAsset = /(?:src|href|data-src)\s*=\s*["']\/(?!\/)|url\(\s*["']?\/(?!\/)|location\.href\s*=\s*["']\/(?!\/)/i;
let failed = false;

for (const game of catalog.games.filter((item) => item.runtimeType === "static")) {
  const html = await readFile(path.join(gamesRoot, ...game.entrypoint.split("/")), "utf8");
  if (rootAbsoluteAsset.test(html)) {
    console.error(`${game.slug}: use relative asset and hub links so the game can open from a downloaded folder.`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("Static game entrypoints use portable relative asset links.");
