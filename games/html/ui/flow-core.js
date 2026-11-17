/* Small, dependency-free screen navigation shared by the embedded games. */
(function () {
  'use strict';
  const ui = window.FourweirdUI = window.FourweirdUI || {};

  ui.button = function (label, action, className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fw-flow-button ' + (className || '');
    button.textContent = label;
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      action();
    });
    return button;
  };

  ui.ScreenFlow = class ScreenFlow {
    constructor(root, options) {
      this.root = root;
      this.options = options;
      this.index = 0;
      this.sections = options.sections;
      this.steps = document.createElement('nav');
      this.steps.className = 'fw-flow-steps';
      this.steps.setAttribute('aria-label', options.label || 'Screen navigation');
      this.labels = this.sections.map((section, index) => {
        const button = ui.button((index + 1) + '. ' + section.label, () => this.go(index));
        this.steps.appendChild(button);
        return button;
      });
      this.status = document.createElement('p');
      this.status.className = 'fw-flow-status';
      this.status.setAttribute('role', 'status');
      this.status.setAttribute('aria-live', 'polite');
      this.controls = document.createElement('div');
      this.controls.className = 'fw-flow-navigation';
      this.previous = ui.button('← Back', () => this.go(this.index - 1));
      this.next = ui.button('Continue →', () => this.go(this.index + 1), 'fw-flow-primary');
      this.controls.append(this.previous, this.next);
      root.prepend(this.steps, this.status);
      root.appendChild(this.controls);
      root.classList.add('fw-flow');
      this.show();
    }

    go(index) {
      if (index < 0 || index >= this.sections.length) return;
      this.index = index;
      this.show();
      this.labels[index].focus({ preventScroll: true });
    }

    show() {
      this.sections.forEach((section, index) => {
        section.element.classList.add('fw-flow-section');
        section.element.dataset.flowActive = String(index === this.index);
        this.labels[index].setAttribute('aria-current', index === this.index ? 'step' : 'false');
      });
      this.previous.hidden = this.index === 0;
      this.next.hidden = this.index === this.sections.length - 1;
      this.status.textContent = 'Step ' + (this.index + 1) + ' of ' + this.sections.length + ' · ' + this.sections[this.index].hint;
      if (this.options.onChange) this.options.onChange(this.index);
    }

    reset() { this.index = 0; this.show(); }
  };
})();
