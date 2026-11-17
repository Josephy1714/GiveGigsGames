(function () {
  'use strict';
  let result;
  window.addEventListener('gravegain5d:run-end', event => {
    const run = event.detail;
    const game = window.GraveGain5D;
    if (!run || !game) return;
    result = result || new window.FourweirdUI.RunResult();
    result.show({
      title: run.win ? 'Multiverse transcended' : 'Your run has ended',
      message: run.win ? 'You cleared every floor. Try another class or universe.'
        : run.hp <= 0 ? 'The haunts overwhelmed you. Use your class ability and heal before your health runs out.'
        : 'Your universe collapsed. Watch the doom clock and hop before it reaches zero.',
      metrics: [['Floor reached', Math.min(10, run.hole + 1) + ' / 10'],
        ['Level', run.level], ['Enemies defeated', run.kills], ['Gold', run.gold],
        ['Score', run.score], ['Best score', run.best]],
      onRetry: () => game.startRun(run.cls, run.universe, run.race),
      onBack: () => game.returnToSetup()
    });
  });
})();
