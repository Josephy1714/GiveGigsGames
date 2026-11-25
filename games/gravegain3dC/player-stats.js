const KEY = 'gravegain3dc_player_stats_v1';
const empty = () => ({ kills: 0, deaths: 0 });
const ratio = ({ kills, deaths }) => deaths ? (kills / deaths).toFixed(2) : kills ? '∞' : '—';
const dayKey = () => new Date().toLocaleDateString('sv-SE');

export function createPlayerStats(dialog) {
    let data = { total: empty(), maps: {}, days: {} };
    try { data = JSON.parse(localStorage.getItem(KEY)) ?? data; } catch { /* Storage unavailable. */ }
    let run = empty();
    let runMap = null;

    function row(label, counts) {
        const tr = document.createElement('tr');
        for (const value of [label, counts.kills, counts.deaths, ratio(counts)]) {
            tr.insertCell().textContent = value;
        }
        return tr;
    }

    return {
        start(mapId) {
            run = empty();
            runMap = mapId;
        },
        record(field) {
            run[field]++;
            data.total[field]++;
            (data.maps[runMap] ??= empty())[field]++;
            (data.days[dayKey()] ??= empty())[field]++;
            try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* Storage unavailable. */ }
        },
        render(map) {
            const rows = dialog.querySelector('#stat-totals');
            const current = runMap === map.id ? [row('Current run', run)] : [];
            rows.replaceChildren(...current, row(map.name, data.maps[map.id] ?? empty()), row('All arenas', data.total));
            const days = Object.keys(data.days).sort().reverse();
            dialog.querySelector('#stat-history').replaceChildren(...days.map(day => row(day, data.days[day])));
            dialog.querySelector('#stats-empty').hidden = days.length > 0;
        }
    };
}
