const KEY = "semester-survival-runner-save";
const VERSION = 1;
export function createDefaultSave() {
  return { version: VERSION, semester: 1, coins: 0, gems: 0, gpa: 0, highScore: 0, totalDistance: 0, upgrades: {}, unlocked: ["fresher"], selectedCharacter: "fresher", stats: { runs: 0, assignments: 0, cats: 0, exams: 0, powerups: 0 } };
}
export function createSaveStore(storage = globalThis.localStorage) {
  return {
    load() {
      try {
        const parsed = JSON.parse(storage?.getItem(KEY) || "null");
        if (!parsed || parsed.version !== VERSION) return createDefaultSave();
        return { ...createDefaultSave(), ...parsed, stats: { ...createDefaultSave().stats, ...(parsed.stats || {}) } };
      } catch { return createDefaultSave(); }
    },
    save(value) {
      const safe = { ...createDefaultSave(), ...value, version: VERSION };
      try { storage?.setItem(KEY, JSON.stringify(safe)); return true; } catch { return false; }
    },
    clear() { try { storage?.removeItem(KEY); return true; } catch { return false; } }
  };
}
export { KEY as SAVE_KEY, VERSION as SAVE_VERSION };
