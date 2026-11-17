/* One decision panel at a time, with the monthly advance always reachable. */
(function () {
  'use strict';
  function mount() {
    const ui = window.FourweirdUI;
    const root = document.getElementById('ff-game-scroll');
    if (!root || root.dataset.flowMounted) return;
    root.dataset.flowMounted = 'true';
    root.querySelectorAll('.input-row-group,.slider-item').forEach((group, index) => {
      const field = group.querySelector('input,select');
      const label = group.querySelector('span');
      if (field && label && !field.labels.length) {
        label.id = label.id || 'fw-finance-field-' + index;
        field.setAttribute('aria-labelledby', label.id);
      }
    });
    const profiles = document.getElementById('profile-cards');
    if (profiles) new ui.PanelBook(profiles, {label: 'Family scenarios'});
    const panels = Array.from(root.querySelectorAll('.tab-panel'));
    const tabs = Array.from(root.querySelectorAll('.game-tabs .tab-btn'));
    panels.forEach(panel => {
      panel.querySelectorAll('.game-card-panel').forEach(card => {
        // Headings already define the decisions; make each one a subpage.
        const children = Array.from(card.children);
        if (children.filter(child => child.matches('h3')).length > 1) {
          let group;
          children.forEach(child => {
            if (!group || child.matches('h3')) {
              group = document.createElement('section');
              card.appendChild(group);
            }
            group.appendChild(child);
          });
          new ui.PanelBook(card, {label: 'Decision details'});
        }
      });
      panel.querySelectorAll('.dashboard-grid').forEach(grid => new ui.PanelBook(grid, {label: 'Decision panels'}));
    });
    const sections = panels.map((element, index) => ({
      element,
      label: tabs[index] ? tabs[index].textContent.replace(/^\S+\s/, '').split(' & ')[0] : 'Panel ' + (index + 1),
      hint: 'Review your plan. Advance the month when you are ready.'
    }));
    const flow = new ui.ScreenFlow(root, {sections});
    const turn = root.querySelector('.turn-control-bar');
    if (turn) root.appendChild(turn);
    tabs.forEach((tab, index) => tab.addEventListener('click', () => flow.go(index)));
    document.querySelectorAll('.ff-tab[data-tab],.ff-sheet [data-tab]').forEach(button => {
      button.addEventListener('click', () => {
        const index = panels.findIndex(panel => panel.id === 'panel-' + button.dataset.tab);
        if (index >= 0) flow.go(index);
      });
    });
    // The event feed remains available as a separate page.
    const feed = document.getElementById('events-log-list');
    if (feed) {
      const feedSection = feed.parentElement;
      flow.sections.push({element: feedSection, label: 'Feed', hint: 'Recent events in your household.'});
      const index = flow.sections.length - 1;
      const label = ui.button('8. Feed', () => flow.go(index));
      flow.labels.push(label);
      flow.steps.appendChild(label);
      flow.show();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
