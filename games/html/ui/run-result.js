/* A bounded, keyboard-accessible end-of-run screen shared by game adapters. */
(function () {
  'use strict';
  const ui = window.FourweirdUI = window.FourweirdUI || {};
  ui.RunResult = class RunResult {
    constructor() {
      this.dialog = document.createElement('dialog');
      this.dialog.className = 'fw-run-result';
      this.title = document.createElement('h2');
      this.title.id = 'fw-run-result-title';
      this.dialog.setAttribute('aria-labelledby', this.title.id);
      this.message = document.createElement('p');
      this.metrics = document.createElement('dl');
      this.actions = document.createElement('div');
      this.actions.className = 'fw-result-actions';
      this.dialog.append(this.title, this.message, this.metrics, this.actions);
      // Keep an ended run's next action explicit; Escape returns to setup.
      this.dialog.addEventListener('cancel', event => {
        event.preventDefault();
        this.close();
        if (this.onBack) this.onBack();
      });
      document.body.appendChild(this.dialog);
    }
    show({title, message, metrics, onRetry, onBack}) {
      this.title.textContent = title;
      this.message.textContent = message;
      this.onBack = onBack;
      this.metrics.replaceChildren();
      metrics.forEach(([label, value]) => {
        const group = document.createElement('div');
        const term = document.createElement('dt');
        const detail = document.createElement('dd');
        term.textContent = label;
        detail.textContent = String(value);
        group.append(term, detail);
        this.metrics.appendChild(group);
      });
      this.actions.replaceChildren(
        ui.button('Change build', () => { this.close(); onBack(); }),
        ui.button('Try again', () => { this.close(); onRetry(); }, 'fw-flow-primary')
      );
      if (!this.dialog.open) this.dialog.showModal();
    }
    close() { this.dialog.close(); }
  };
})();
