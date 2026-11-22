/* Compact, keyboard-friendly setup flow for the Last Words title screen. */
class LWZMenuFlow {
  constructor(root) {
    this.root = root;
    this.pages = [...(root?.querySelectorAll('[data-menu-page]') || [])];
    this.index = 0;
    this.back = root?.querySelector('#lwz-menu-back');
    this.next = root?.querySelector('#lwz-menu-next');
    this.step = root?.querySelector('#lwz-menu-step');
    this.labels = ['Briefing', 'Threat level', 'Map'];
  }

  bind(root) {
    if (!root || !this.pages.length) return;
    this.back?.addEventListener('click', () => this.show(this.index - 1));
    this.next?.addEventListener('click', () => this.show(this.index + 1));
    this.pages.forEach((page) => {
      page.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') this.show(this.index - 1);
        if (event.key === 'ArrowRight') this.show(this.index + 1);
      });
    });
    this.show(0);
  }

  show(index) {
    this.index = Math.max(0, Math.min(this.pages.length - 1, index));
    this.pages.forEach((page, position) => {
      const active = position === this.index;
      page.hidden = !active;
      page.classList.toggle('is-active', active);
      page.setAttribute('aria-hidden', String(!active));
    });
    if (this.back) {
      this.back.disabled = this.index === 0;
      this.back.setAttribute('aria-label', 'Previous setup screen');
    }
    if (this.next) {
      const finalPage = this.index === this.pages.length - 1;
      this.next.disabled = finalPage;
      this.next.textContent = finalPage ? 'READY' : `NEXT: ${this.labels[this.index + 1]} →`;
      this.next.setAttribute('aria-label', finalPage ? 'Setup complete' : `Next setup screen: ${this.labels[this.index + 1]}`);
    }
    if (this.step) this.step.textContent = `${this.labels[this.index]} · ${this.index + 1} of ${this.pages.length}`;
  }
}
