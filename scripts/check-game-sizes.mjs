#!/usr/bin/env node
import { lstat, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gamesRoot = path.join(repoRoot, "games");
const limit = 10_000_000;
const catalog = JSON.parse(await (await import("node:fs/promises")).readFile(path.join(gamesRoot, "catalog.json"), "utf8"));
const slugs = new Set();
const folders = new Map();
let failed = false;

async function folderSize(folder) {
  let total = 0;
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const fullPath = path.join(folder, entry.name);
    const info = await lstat(fullPath);
    if (info.isSymbolicLink()) throw new Error(`Symlinks are not allowed in game packages: ${fullPath}`);
    if (entry.isDirectory()) total += await folderSize(fullPath);
    else if (entry.isFile()) total += info.size;
  }
  return total;
}

for (const game of catalog.games) {
  if (!game.slug || slugs.has(game.slug)) {
    console.error(`Invalid or duplicate game slug: ${game.slug || "(empty)"}`);
    failed = true;
    continue;
  }
  slugs.add(game.slug);
  if (game.runtimeType === "external") {
    if (!/^https:\/\//i.test(game.externalUrl || "")) {
      console.error(`${game.slug}: external games require an https externalUrl.`);
      failed = true;
    }
    continue;
  }

  if (game.runtimeType !== "static" || !game.entrypoint || path.posix.isAbsolute(game.entrypoint) || game.entrypoint.split("/").includes("..")) {
    console.error(`${game.slug}: invalid static entrypoint.`);
    failed = true;
    continue;
  }

  const entrypoint = path.resolve(gamesRoot, ...game.entrypoint.split("/"));
  if (!entrypoint.startsWith(gamesRoot + path.sep)) {
    console.error(`${game.slug}: entrypoint escapes games/.`);
    failed = true;
    continue;
  }
  const entryInfo = await stat(entrypoint).catch(() => null);
  if (!entryInfo?.isFile()) {
    console.error(`${game.slug}: missing entrypoint ${game.entrypoint}.`);
    failed = true;
    continue;
  }

  const folder = path.dirname(entrypoint);
  const bytes = folders.has(folder) ? folders.get(folder) : await folderSize(folder);
  folders.set(folder, bytes);
  if (bytes >= limit) {
    console.error(`${game.slug}: ${bytes.toLocaleString()} bytes; each game must be under ${limit.toLocaleString()} bytes (10 MB).`);
    failed = true;
  } else {
    console.log(`${game.slug}: ${(bytes / 1_000_000).toFixed(2)} MB`);
  }
}

if (failed) process.exit(1);
console.log(`All ${folders.size} local game packages are below 10 MB.`);
