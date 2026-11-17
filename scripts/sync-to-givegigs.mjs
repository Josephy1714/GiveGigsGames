#!/usr/bin/env node
import { cp, copyFile, mkdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetRootArg = process.argv[2];

if (!targetRootArg) {
  console.error("Usage: node scripts/sync-to-givegigs.mjs <path-to-GiveGigs-v7>");
  process.exit(2);
}

const targetRoot = await realpath(targetRootArg);
const publicRoot = path.join(targetRoot, "public");
const libRoot = path.join(targetRoot, "src", "lib");
const gameSource = path.join(repoRoot, "games");
const publicGames = path.join(publicRoot, "games");
const generatedCatalog = path.join(libRoot, "games-catalog.generated.json");

for (const requiredPath of [publicRoot, libRoot]) {
  const info = await stat(requiredPath).catch(() => null);
  if (!info?.isDirectory()) throw new Error(`Not a GiveGigs v7 root: expected ${requiredPath}`);
}

await mkdir(publicGames, { recursive: true });
await cp(gameSource, publicGames, { recursive: true, force: true });
await copyFile(path.join(gameSource, "catalog.json"), generatedCatalog);
console.log(`Synced ${gameSource} to ${publicGames}`);
console.log(`Updated ${generatedCatalog}`);
