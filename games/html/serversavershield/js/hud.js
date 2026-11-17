// One live, accessible status bar replaces the stale HTML/canvas HUD pair.
var serverHudNodes = null;
function initServerHud() {
    const root = document.querySelector('.hud');
    if (!root || serverHudNodes) return;
    serverHudNodes = {};
    root.replaceChildren();
    root.setAttribute('aria-label', 'Data center status');
    const fields = [
        ['balance', 'Balance / income'], ['trust', 'Customer trust'],
        ['reputation', 'Reputation'], ['health', 'Server health'],
        ['hudScore', 'Score'], ['hudWave', 'Wave / 10'],
        ['weapon', 'Weapon'], ['kills', 'Threats stopped']
    ];
    fields.forEach(([id,label]) => {
        const card = document.createElement('div');
        card.className = 'fw-defense-stat';
        const title = document.createElement('span');
        title.className = 'fw-defense-label';
        title.textContent = label;
        const value = document.createElement('strong');
        value.id = id === 'hudScore' || id === 'hudWave' ? id : 'fw-defense-' + id;
        serverHudNodes[id] = value;
        card.append(title,value);
        root.appendChild(card);
    });
    // Retain historical display ids for existing reset/debug helpers.
    const hpText = document.createElement('span');
    hpText.id = 'hpText';
    hpText.hidden = true;
    const hpBar = document.createElement('span');
    hpBar.id = 'hpBar';
    hpBar.hidden = true;
    root.append(hpText,hpBar);
    document.body.classList.add('fw-defense-hud');
    const controls = document.getElementById('mobileTouchControls');
    if (controls) {
        const pause = document.createElement('button');
        pause.type = 'button';
        pause.className = 'fw-defense-pause';
        pause.textContent = 'Ⅱ';
        pause.setAttribute('aria-label', 'Pause defense');
        pause.addEventListener('click', event => {
            event.stopPropagation();
            if (gameRunning && !gamePaused) pauseGame();
        });
        controls.appendChild(pause);
    }
    updateServerHud();
}

function updateServerHud() {
    if (!serverHudNodes) return;
    const set = (key,value) => {
        const element = serverHudNodes[key];
        const text = String(value);
        if (element.textContent !== text) element.textContent = text;
    };
    const capacity = servers.reduce((sum,server) => sum + Math.max(0,server.maxHp || 150),0);
    const health = servers.reduce((sum,server) => sum + Math.max(0,server.hp || 0),0);
    const pct = capacity ? Math.round(100 * health / capacity) : 0;
    set('balance','$' + Math.floor(gameState.balance).toLocaleString() + ' +$' + gameState.incomePerSec + '/s');
    set('trust',Math.floor(gameState.customerTrust) + '%');
    set('reputation',Math.floor(gameState.reputation) + '%');
    set('health',pct + '% · ' + servers.filter(server => server.hp > 0).length + '/' + servers.length + ' online');
    set('hudScore',score.toLocaleString());
    set('hudWave',wave + ' / 10');
    const weapon = WEAPONS[currentWeapon] || WEAPONS.standard;
    set('weapon',weapon.emoji + ' ' + weapon.name + (weaponTimer > 0 ? ' ' + Math.ceil(weaponTimer / 60) + 's' : ''));
    set('kills',kills);
    const fire = document.getElementById('touchFireBtn');
    if (fire) {
        fire.setAttribute('aria-pressed',String(isShooting));
        fire.classList.toggle('active',!!isShooting);
        const label = isShooting ? '🔥 ON' : '🔥 OFF';
        if (fire.textContent !== label) fire.textContent = label;
    }
}
