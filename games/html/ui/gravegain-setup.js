/* Three short screens: race -> class -> time mode -> deploy. */
(function () {
  function mount() {
  'use strict';
  const ui = window.FourweirdUI;
  const screen = document.getElementById('charSelectScreen');
  const race = document.getElementById('raceGrid');
  const classes = document.getElementById('classGrid');
  const modes = document.getElementById('charModeSelectGrid');
  const deploy = document.getElementById('btnCharSelectStart');
  const back = document.getElementById('btnCharSelectBack');
  if (!screen || !race || !classes || !deploy || !back) return;
  const content = screen.querySelector('.menu-content');
  if (!content || content.dataset.flowMounted) return;
  content.dataset.flowMounted = 'true';
  screen.classList.add('fw-setup-screen');
  const title = content.querySelector('.menu-title');
  const subtitle = content.querySelector('.menu-subtitle');
  if (subtitle) subtitle.hidden = true;
  const wrap = function (element, name) {
    const section = document.createElement('section');
    section.className = 'fw-setup-stage';
    section.setAttribute('aria-label', name);
    element.before(section);
    section.appendChild(element);
    return section;
  };
  const raceSection = wrap(race, 'Choose your race');
  const classSection = wrap(classes, 'Choose your class');
  const modeSection = modes && (modes.closest('.run-mode-select') || modes.parentElement);
  if (modeSection) Array.from(modeSection.children).filter(element => element !== modes).forEach(element => { element.hidden = true; });
  const raceDeck = new ui.ChoiceDeck(race, 'Race');
  const classDeck = new ui.ChoiceDeck(classes, 'Class');
  const modeDeck = modes && new ui.ChoiceDeck(modes, 'Mode');
  const actions = deploy.parentElement;
  actions.classList.add('fw-setup-actions');
  back.textContent = 'Main menu';
  const titles = ['Choose your race', 'Choose your class', 'Choose your time mode'];
  const sections = [
      { label: 'Race', element: raceSection, hint: 'Browse the races and choose your abilities.' },
      { label: 'Class', element: classSection, hint: 'Choose the combat role for this run.' }
  ];
  if (modeSection) sections.push({ label: 'Mode', element: modeSection, hint: 'Choose your pace, then deploy.' });
  const flow = new ui.ScreenFlow(content, {
    sections,
    onChange(index) {
      if (title) title.textContent = titles[index];
      deploy.hidden = index !== sections.length - 1;
      actions.dataset.finalStep = String(index === sections.length - 1);
    }
  });
  const observer = new MutationObserver(function () {
    if (!screen.classList.contains('hidden') && screen.style.display !== 'none') {
      flow.reset();
      raceDeck.reset();
      classDeck.reset();
      if (modeDeck) modeDeck.reset();
    }
  });
  flow.controls.prepend(back);
  flow.controls.appendChild(deploy);
  actions.remove();
  observer.observe(screen, { attributes: true, attributeFilter: ['class', 'style'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();

