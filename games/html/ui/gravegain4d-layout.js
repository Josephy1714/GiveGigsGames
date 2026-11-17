/* Scope engine-owned HUD layers to the arena instead of the entire iframe. */
(function () {
  'use strict';
  function mount() {
    const arena = document.getElementById('canvasContainer');
    const main = document.getElementById('gameMain');
    if (!arena || !main) return;
    const help = document.createElement('dialog');
    help.className = 'fw-4d-help';
    help.setAttribute('aria-label', 'GraveGain 4D controls');
    const heading = document.createElement('h2');
    heading.textContent = 'Navigate the hyperdungeon';
    const instructions = document.createElement('p');
    instructions.textContent = 'WASD moves. Swipe or move the mouse to look. R / E shifts between Ana and Kata. Click attacks or putts; right-click blocks. Space jumps. F uses your class ability, Q uses juice, T rewinds, and B changes branes. Keys 1 / 2 / 3 switch real-time, chrono, and turn-based modes.';
    const touch = document.createElement('p');
    touch.textContent = 'On touch: use the left stick to move, swipe the arena to look, and use two fingers to twist your 4D view. The right-hand keys shift dimensions, attack, putt, jump, and rewind.';
    help.append(heading, instructions, touch, window.FourweirdUI.button('Back to pause', () => help.close()));
    document.body.appendChild(help);
    const footer = main.querySelector('.desktop-bottom-row');
    if (footer) footer.appendChild(window.FourweirdUI.button('Controls', () => {
      const pause = document.getElementById('btnPause');
      if (pause) pause.click();
      help.showModal();
    }));
    const selector = '.gg4d-hud,.gg4d-touch,.gg4d-contract,.gg4d-radar,.gg4d-stone,.gg4d-modepill';
    const relocate = () => {
      document.querySelectorAll(selector).forEach(layer => {
        if (layer.parentElement !== arena) arena.appendChild(layer);
      });
    };
    const observer = new MutationObserver(records => {
      if (records.some(record => Array.from(record.addedNodes).some(node =>
        node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector))))) relocate();
    });
    observer.observe(document.body, {childList:true, subtree:true});
    relocate();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
