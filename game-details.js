(() => {
  const catalog = window.GIVEGIGSGAMES_CATALOG?.games || [];
  const game = window.GGGGameRoute?.resolve("info", catalog);
  const description = document.getElementById("description");
  if (!game) {
    description.textContent = "Game unavailable. Choose a title from the library.";
    return;
  }
  const hosted = game.runtimeType === "external";
  const formatSize = (bytes) => {
    const value = Number(bytes) || 0;
    if (!value) return "";
    return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(2)} MB` : `${Math.max(1, Math.round(value / 1_000))} KB`;
  };
  document.title = `${game.title} · GiveGigsGames`;
  document.getElementById("title").textContent = game.title;
  description.textContent = game.description;

  const statusLabel = game.status ? `${game.status[0].toUpperCase()}${game.status.slice(1)}` : "";
  const sizeLabel = formatSize(game.packageBytes);
  const reqParts = [
    game.genre,
    hosted ? "Internet connection required" : "Offline-friendly browser game",
    statusLabel,
    sizeLabel
  ].filter(Boolean);
  document.getElementById("requirements").textContent = reqParts.join(" · ");
  document.getElementById("controls").textContent = game.controls || "Controls are listed in the game when available.";

  const tagsEl = document.getElementById("tags");
  if (tagsEl) {
    const chips = [
      ...(game.modes || []).map((m) => ({ label: `Mode: ${m}`, accent: true })),
      ...(game.inputs || []).map((i) => ({ label: `Input: ${i}`, accent: true })),
      ...(game.tags || []).map((t) => ({ label: t, accent: false }))
    ];
    if (chips.length > 0) {
      tagsEl.replaceChildren();
      for (const chip of chips) {
        const span = document.createElement("span");
        span.className = chip.accent ? "details-tag is-accent" : "details-tag";
        span.textContent = chip.label;
        tagsEl.append(span);
      }
      tagsEl.hidden = false;
    }
  }

  const extra = window.GIVEGIGSGAMES_DETAILS?.[game.slug]
    || Object.entries(window.GIVEGIGSGAMES_DETAILS || {}).find(([k]) => k.toLowerCase() === game.slug.toLowerCase())?.[1];
  if (extra) {
    if (extra.objective || extra.modes) {
      document.getElementById("details-objective").textContent = extra.objective || "";
      document.getElementById("details-modes").textContent = extra.modes ? `Modes: ${extra.modes}` : "";
      document.getElementById("details-objective-card").hidden = false;
    }
    if (extra.systems) {
      document.getElementById("details-systems").textContent = extra.systems;
      document.getElementById("details-systems-card").hidden = false;
    }
    if (extra.saves || extra.platform) {
      document.getElementById("details-saves").textContent = extra.saves ? `Saves: ${extra.saves}` : "";
      document.getElementById("details-platform").textContent = extra.platform || "";
      document.getElementById("details-saves-card").hidden = false;
    }
  }

  const slug = game.slug;
  document.getElementById("play").href = hosted ? game.externalUrl : `/ggg/play/${encodeURIComponent(slug)}`;
  document.getElementById("tester").href = `/ggg/test/${encodeURIComponent(slug)}`;
  document.getElementById("guide").href = `/ggg/guide/${encodeURIComponent(slug)}`;
  document.getElementById("nav-play").href = `/ggg/play/${encodeURIComponent(slug)}`;
  document.getElementById("nav-test").href = `/ggg/test/${encodeURIComponent(slug)}`;
  document.getElementById("nav-info").href = `/ggg/info/${encodeURIComponent(slug)}`;
  document.getElementById("nav-guide").href = `/ggg/guide/${encodeURIComponent(slug)}`;
  document.getElementById("roadmap").href = `/ggg/roadmap/${encodeURIComponent(slug)}`;
  document.getElementById("nav-roadmap").href = `/ggg/roadmap/${encodeURIComponent(slug)}`;
  document.getElementById("actions").hidden = false;
  const screenshotsEl = document.getElementById("screenshots");
  if (screenshotsEl && Array.isArray(game.featuredScreenshots) && game.featuredScreenshots.length > 0) {
    screenshotsEl.innerHTML = "";
    game.featuredScreenshots.forEach((src, index) => {
      const img = document.createElement("img");
      img.src = `/${src.replace(/^\/+/, "")}`;
      img.alt = `${game.title} gameplay screenshot ${index + 1}`;
      img.loading = "lazy";
      screenshotsEl.appendChild(img);
    });
    screenshotsEl.hidden = false;
  }
})();
