(function () {
  'use strict';
  function mount() {
    const root = document.getElementById('startScreen');
    if (!root || root.dataset.flowMounted) return;
    root.dataset.flowMounted = 'true';
    const ui = window.FourweirdUI;
    const result = document.getElementById('gameOverScreen');
    const stats = result && result.querySelector('.final-stats');
    const threats = document.getElementById('killStats');
    if (stats && threats) {
      const pages = document.createElement('div');
      pages.className = 'fw-defense-results';
      stats.before(pages);
      pages.append(stats,threats.parentElement);
      const book = new ui.PanelBook(pages,{label:'Run details'});
      new MutationObserver(() => {
        if (!result.classList.contains('hidden')) book.go(0);
      }).observe(result,{attributes:true,attributeFilter:['class']});
    }
    const start = document.getElementById('btnStart');
    const difficulty = document.getElementById('btnEasy').parentElement.parentElement;
    const graphics = document.getElementById('btnFast').parentElement.parentElement;
    const overview = document.createElement('section');
    [root.querySelector('.tagline'), root.querySelector('.story'), root.querySelector('.enemies-preview')]
      .filter(Boolean).forEach(element => overview.appendChild(element));
    root.appendChild(overview);
    const controls = document.createElement('section');
    const hints = root.querySelector('.controls-hint');
    if (hints) controls.appendChild(hints);
    const guide = root.querySelector('a[href="guide.html"]');
    if (guide) {
      guide.target = '_blank';
      guide.rel = 'noopener';
      guide.textContent = 'Open full game manual ↗';
      controls.appendChild(guide);
    }
    root.appendChild(controls);
    const flow = new ui.ScreenFlow(root, {
      label:'Defense setup',
      sections:[
        {label:'Briefing',element:overview,hint:'Protect the data center through ten attack waves.'},
        {label:'Difficulty',element:difficulty,hint:'Choose a challenge level for this run.'},
        {label:'Graphics',element:graphics,hint:'Choose smooth performance or richer visual effects.'},
        {label:'Controls',element:controls,hint:'Review the controls, then deploy your shield.'}
      ],
      onChange(index) { start.hidden = index !== 3; }
    });
    flow.controls.appendChild(start);
    const observer = new MutationObserver(() => {
      if (!root.classList.contains('hidden')) flow.reset();
    });
    observer.observe(root,{attributes:true,attributeFilter:['class']});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',mount);
  else mount();
})();
