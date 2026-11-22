(function () {
    'use strict';

    class CombatTextManager {
        constructor(container, camera) { this.container = container; this.camera = camera; }
        spawnText(worldX, worldY, worldZ, text, type = 'damage', isDamageNumber = false) {
            if (!this.container) return;
            if ((isDamageNumber || type === 'damage' || type === 'player-dmg') &&
                document.getElementById('settingsDamageNumbers')?.checked === false) return;
            const position = new THREE.Vector3(worldX, worldY + 14, worldZ).project(this.camera);
            if (position.z > 1) return;
            const rect = this.container.getBoundingClientRect();
            const element = document.createElement('div');
            element.className = `combat-text ${type}`;
            element.style.left = `${(position.x * 0.5 + 0.5) * rect.width}px`;
            element.style.top = `${(-position.y * 0.5 + 0.5) * rect.height}px`;
            element.textContent = text;
            this.container.appendChild(element);
            setTimeout(() => element.remove(), 850);
        }
        showBanner(text, duration = 2500) {
            const banner = document.getElementById('hudNotification');
            if (!banner) return;
            const resolvedText = (text && typeof text === 'object')
                ? (text.text || text.message || text.title || '')
                : String(text ?? '');
            if (!resolvedText) return;
            banner.textContent = resolvedText;
            banner.classList.remove('hidden');
            clearTimeout(this.bannerTimer);
            this.bannerTimer = setTimeout(() => banner.classList.add('hidden'), duration);
        }
    }

    window.GraveGainCombatTextManager = CombatTextManager;
})();
