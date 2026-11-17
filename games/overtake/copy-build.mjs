import { copyFile } from "node:fs/promises";

await copyFile(new URL("./dist/main.js", import.meta.url), new URL("./game.js", import.meta.url));
