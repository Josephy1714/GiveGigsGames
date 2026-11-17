/* Paginate existing DOM panels without cloning inputs or losing their handlers. */
(function () {
  'use strict';
  const ui = window.FourweirdUI;
  ui.PanelBook = class PanelBook {
    constructor(root, options = {}) {
      this.root = root;
      this.options = options;
      this.index = 0;
      this.items = Array.from(root.children);
      if (this.items.length < 2) return;
      root.classList.add('fw-panel-book');
      this.navigation = document.createElement('nav');
      this.navigation.className = 'fw-book-navigation';
      this.navigation.setAttribute('aria-label', options.label || 'Panel pages');
      this.previous = ui.button('← Previous', () => this.go(this.index - 1));
      this.next = ui.button('Next →', () => this.go(this.index + 1));
      this.previous.setAttribute('aria-label', 'Previous ' + (options.label || 'page'));
      this.next.setAttribute('aria-label', 'Next ' + (options.label || 'page'));
      this.status = document.createElement('span');
      this.status.setAttribute('role', 'status');
      this.navigation.append(this.previous, this.status, this.next);
      root.appendChild(this.navigation);
      this.render();
    }
    go(index) {
      if (index < 0 || index >= this.items.length) return;
      this.index = index;
      this.render();
    }
    render() {
      this.items.forEach((item, index) => {
        item.dataset.fwPage = String(index === this.index);
      });
      const current = this.items[this.index];
      const heading = current.querySelector('h2,h3,h4,.input-group-title,.scenario-title');
      this.status.textContent = (heading ? heading.textContent.trim() + ' · ' : '') +
        (this.index + 1) + ' / ' + this.items.length;
      this.previous.disabled = this.index === 0;
      this.next.disabled = this.index === this.items.length - 1;
    }
  };
})();
