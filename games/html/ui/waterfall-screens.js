(function () {
  'use strict';
  function mount() {
    const ui = window.FourweirdUI;
    const root = document.querySelector('.waterfall-game-main');
    if (!root || root.dataset.flowMounted) return;
    root.dataset.flowMounted = 'true';
    const aside = root.querySelector('aside');
    const about = document.createElement('section');
    const disclaimer = root.querySelector('.disclaimer-banner');
    const links = root.querySelector('.info-links');
    if (disclaimer) about.appendChild(disclaimer);
    if (links) about.appendChild(links);
    const definitions = [
      ['Payout', root.querySelector('.waterfall-game-frame'), 'Choose an exit price and inspect who gets paid.'],
      ['Terms', document.getElementById('tab-sandbox'), 'Change one layer of the capital stack at a time.'],
      ['Challenges', document.getElementById('tab-scenarios'), 'Choose a scenario to test your understanding.'],
      ['Handbook', document.getElementById('tab-handbook'), 'Read the concepts behind the payout.'],
      ['Audit', root.querySelector('.waterfall-stats-card'), 'Review the detailed allocation and warnings.'],
      ['About', about, 'Source material and educational simulation disclaimer.']
    ];
    const sections = definitions.filter(([, element]) => element).map(([label, element, hint]) => {
      root.appendChild(element);
      return {label, element, hint};
    });
    if (aside) aside.hidden = true;
    new ui.PanelBook(document.querySelector('.scenario-list'), {label: 'Challenges'});
    new ui.PanelBook(document.querySelector('.handbook-article'), {label: 'Handbook articles'});
    const sandbox = document.getElementById('tab-sandbox');
    const terms = document.createElement('div');
    Array.from(sandbox.querySelectorAll(':scope > .input-group')).forEach(group => terms.appendChild(group));
    sandbox.prepend(terms);
    new ui.PanelBook(terms, {label: 'Capital stack terms'});
    const flow = new ui.ScreenFlow(root, {sections});
    document.querySelectorAll('.scenario-card').forEach(card => card.addEventListener('click', () => flow.go(1)));
    document.querySelectorAll('.control-tabs .tab-btn').forEach(button => button.addEventListener('click', () => {
      const index = sections.findIndex(section => section.element.id === button.dataset.tab);
      if (index >= 0) flow.go(index);
    }));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
