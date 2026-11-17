/* Show complete choice descriptions one at a time, retaining native handlers. */
(function () {
  'use strict';
  const ui = window.FourweirdUI;
  ui.ChoiceDeck = class ChoiceDeck {
    constructor(root, label) {
      this.root = root;
      this.label = label;
      this.index = 0;
      this.controls = document.createElement('div');
      this.controls.className = 'fw-choice-navigation';
      this.previous = ui.button('‹ Previous', () => this.move(-1));
      this.next = ui.button('Next ›', () => this.move(1));
      this.status = document.createElement('span');
      this.status.setAttribute('role', 'status');
      this.controls.append(this.previous, this.status, this.next);
      root.after(this.controls);
      root.classList.add('fw-choice-deck');
      root.addEventListener('click', () => queueMicrotask(() => this.updateSelection()));
      this.observer = new MutationObserver(() => this.render());
      this.observer.observe(root, { childList: true });
      this.render();
    }

    items() { return Array.from(this.root.children); }

    move(delta) {
      const count = this.items().length;
      if (!count) return;
      this.index = (this.index + delta + count) % count;
      this.render();
      const item = this.items()[this.index];
      // Selecting a page also selects that race/mode through the game's own API.
      item.click();
    }

    render() {
      const items = this.items();
      this.index = Math.min(this.index, Math.max(0, items.length - 1));
      items.forEach((item, index) => {
        item.classList.add('fw-choice-card');
        item.dataset.choiceVisible = String(index === this.index);
        if (!item.matches('button,input,select,a') && !item.dataset.choiceKeyboard) {
          item.dataset.choiceKeyboard = 'true';
          item.tabIndex = 0;
          item.setAttribute('role', 'button');
          item.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              item.click();
            }
          });
        }
      });
      this.status.textContent = this.label + ' ' + (this.index + 1) + ' / ' + items.length;
      this.previous.disabled = items.length < 2;
      this.next.disabled = items.length < 2;
      this.updateSelection();
    }

    updateSelection() {
      this.items().forEach(item => item.setAttribute('aria-pressed', String(
        item.classList.contains('selected') || item.classList.contains('sel')
      )));
    }

    reset() {
      const selected = this.items().findIndex(item => item.classList.contains('selected') || item.classList.contains('sel') || item.getAttribute('aria-pressed') === 'true');
      this.index = Math.max(0, selected);
      this.render();
    }
  };
})();
