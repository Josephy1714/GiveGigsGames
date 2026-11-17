// Storage can be blocked in private or sandboxed embeds. A run must still start.
function neonReadRecord(key) {
  try { const value = Number(localStorage.getItem(key)); return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0; }
  catch (_) { return 0; }
}
function neonWriteRecord(key, value) {
  try { localStorage.setItem(key, String(value)); } catch (_) { /* In-memory record remains available. */ }
}
