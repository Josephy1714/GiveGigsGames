/* Preserve the game's selection handlers while separating build decisions. */
(function () {
  function mount() {
  'use strict';
  const ui = window.FourweirdUI;
  const prefix = document.getElementById('gg1dMenu') ? 'gg1d' : 'gg5d';
  const menu = document.getElementById(prefix + 'Menu');
  const launch = document.getElementById(prefix + 'GoBtn');
  if (!menu || !launch || menu.dataset.flowMounted) return;
  menu.dataset.flowMounted = 'true';
  menu.classList.add('fw-leyline-setup');
  const definitions = prefix === 'gg1d' ? [
    ['Race', 'RacePick', 'Choose your ancestry and starting strengths.'],
    ['Class', 'ClassPick', 'Choose a weapon and a signature ritual.'],
    ['Pace', 'ModePick', 'Turn-based gives you time to plan every move.']
  ] : [
    ['Universe', 'UniversePick', 'Choose the rules of your first universe.'],
    ['Class', 'ClassPick', 'Choose your combat style before entering the rift.']
  ];
  const sections = definitions.map(([label, suffix, hint]) => {
    const choices = document.getElementById(prefix + suffix);
    const element = document.createElement('section');
    choices.before(element);
    element.appendChild(choices);
    const deck = new ui.ChoiceDeck(choices, label);
    deck.reset();
    return { label, hint, element };
  });
  // The full codex is a separate reference screen rather than a long footer.
  const codex = document.getElementById(prefix + 'Codex');
  {
    const guide = document.createElement('section');
    const controls = document.createElement('p');
    controls.textContent = prefix === 'gg1d'
      ? 'Step east to advance. Attack enemies before they enter range. Use your ritual against groups and save a potion for the boss. In turn-based mode, Wait lets enemies approach without moving.'
      : 'Strike enemies to clear each floor. Hop changes universes and builds your combo, but raises paradox and respawns enemies. Use Ability for your class power and Vent to heal with a potion. Leave collapsing universes before their doom clock reaches zero. Every action is a turn.';
    menu.appendChild(guide);
    guide.appendChild(controls);
    if (codex) guide.appendChild(codex);
    sections.push({label: 'Guide', hint: 'Review the controls, then begin your run.', element: guide});
  }
  const flow = new ui.ScreenFlow(menu, {
    sections,
    onChange(index) { launch.hidden = index !== sections.length - 1; }
  });
  flow.controls.appendChild(launch);
  window.addEventListener('fourweird:setup', () => flow.reset());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();

