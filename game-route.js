(() => {
  function candidates(view) {
    const values = [new URLSearchParams(location.search).get("game")];
    const match = location.pathname.match(new RegExp(`^/ggg/${view}/([^/]+)/?$`, "i"));
    if (match) {
      try { values.push(decodeURIComponent(match[1])); }
      catch { values.push(match[1]); }
    }
    return values.filter(Boolean).map((slug) => slug.toLowerCase());
  }

  window.GGGGameRoute = {
    resolve(view, games) {
      for (const slug of candidates(view)) {
        const game = games?.find((entry) => String(entry.slug || "").toLowerCase() === slug);
        if (game) return game;
      }
      return null;
    }
  };
})();
