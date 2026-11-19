import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const baseUrl = process.env.ARCADE_SMOKE_URL || "http://127.0.0.1:4173";
  // Mirror the production Vercel rewrites when running the static smoke server locally.
  await page.route("**/ggg/**", async route => {
    const requested = new URL(route.request().url());
    const parts = requested.pathname.split("/").filter(Boolean);
    let destination = "/index.html";
    if (parts[1] === "play" && parts[2]) destination = `/play.html?game=${encodeURIComponent(parts[2])}`;
    else if (parts[1] === "info" && parts[2]) destination = `/game.html?game=${encodeURIComponent(parts[2])}`;
    else if (parts[1] === "test" && parts[2]) destination = `/tester/index.html?game=${encodeURIComponent(parts[2])}`;
    await route.continue({ url: requested.origin + destination });
  });
  await page.goto(`${baseUrl}/index.html#all-games`);
  const search = page.getByRole("searchbox", { name: "Search titles, genres, and tags" });
  await search.fill("Platform Wars");
  const play = page.locator("#launch-platform-wars");
  await play.click();
  await page.frameLocator("#game-frame").locator("#arena").waitFor({ state: "attached" });
  await page.getByRole("link", { name: "Back to game select" }).click();
  await page.waitForFunction(() => document.activeElement?.id === "launch-platform-wars");
  assert.equal(await search.inputValue(), "Platform Wars");

  const card = page.locator(".game-card").filter({ has: play });
  await card.getByRole("button", { name: "Favorite Platform Wars" }).click();
  await page.getByLabel("Collection").selectOption("favorites");
  assert.equal(await page.locator(".game-card").count(), 1);
  await card.getByRole("link", { name: "Game details" }).click();
  await page.getByRole("heading", { name: "Platform Wars: Phone vs Desktop" }).waitFor();

  await page.goto(`${baseUrl}/index.html#all-games`);
  await page.locator("#save-file-input").setInputFiles({
    name: "backup.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(JSON.stringify({
      format: "givegigsgames-backup",
      version: 1,
      saves: [{ type: "localStorage", key: "platform-wars-smoke", value: "progress" }]
    }))
  });
  await page.getByRole("button", { name: "Restore selected" }).click();
  await page.waitForFunction(() => localStorage.getItem("platform-wars-smoke") === "progress");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all saves" }).click();
  assert.equal((await download).suggestedFilename(), "givegigsgames-backup.txt");
} finally {
  await browser.close();
}
