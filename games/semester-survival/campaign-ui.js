/* Semester Survival — compact chapter objective HUD. */
(function (root) {
  'use strict';
  function create(options) {
    options = options || {};
    const host = options.root;
    const doc = options.document || (host && host.ownerDocument) || root.document;
    const campaign = options.campaignRuntime;
    if (!host || !doc || !campaign || typeof campaign.getState !== 'function') {
      throw new Error('Campaign UI requires a root, document, and campaign runtime.');
    }
    let destroyed = false;
    let collapsed = false;
    let signature = '';
    function el(tag, className, value) {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      if (value !== undefined) node.textContent = String(value);
      return node;
    }
    function makeButton(label, className, callback, aria) {
      const node = el('button', className, label);
      node.type = 'button';
      node.setAttribute('aria-label', aria || label);
      node.addEventListener('click', callback);
      return node;
    }
    function render() {
      if (destroyed) return;
      const state = campaign.getState();
      const view = {
        semester: state.semester, chapterIndex: state.chapterIndex,
        chapter: state.chapter && { id: state.chapter.id, title: state.chapter.title, objective: state.chapter.objective },
        steps: (state.steps || []).map(step => ({ id: step.id, title: step.title, description: step.description, count: step.count, requiredCount: step.requiredCount, complete: step.complete })),
        completedSteps: state.completedSteps || 0, totalSteps: state.totalSteps || 0,
        campaignComplete: !!state.campaignComplete
      };
      const next = JSON.stringify({ view: view, collapsed: collapsed });
      if (next === signature) return;
      signature = next;
      while (host.firstChild) host.removeChild(host.firstChild);
      host.classList.toggle('is-active', true);
      const card = el('section', 'ss-campaign-ui__card');
      card.setAttribute('aria-label', 'Current story objective');
      const header = el('header', 'ss-campaign-ui__header');
      const identity = el('div', 'ss-campaign-ui__identity');
      identity.appendChild(el('span', 'ss-campaign-ui__eyebrow', 'YOUR STORY'));
      identity.appendChild(el('span', 'ss-campaign-ui__semester', 'SEMESTER ' + state.semester));
      const toggle = makeButton(collapsed ? '＋' : '−', 'ss-campaign-ui__toggle', function () {
        collapsed = !collapsed; signature = ''; render();
      }, collapsed ? 'Expand objectives' : 'Collapse objectives');
      header.appendChild(identity);
      header.appendChild(toggle);
      card.appendChild(header);
      if (state.campaignComplete && !state.chapter) {
        card.appendChild(el('h2', 'ss-campaign-ui__title', 'Your story continues beyond campus'));
        card.appendChild(el('p', 'ss-campaign-ui__description', 'All authored chapters are complete.'));
      } else if (!state.chapter && !state.campaignComplete) {
        card.appendChild(el('h2', 'ss-campaign-ui__title', 'Semester objectives complete'));
        card.appendChild(el('p', 'ss-campaign-ui__description', 'You have completed this semester’s story chapters. Finish your academic requirements to unlock the next chapter of university life.'));
      } else if (state.chapter) {
        card.appendChild(el('h2', 'ss-campaign-ui__title', state.chapter.title));
        card.appendChild(el('p', 'ss-campaign-ui__description', state.chapter.objective));
        const progress = el('div', 'ss-campaign-ui__progress');
        const meter = el('div', 'ss-campaign-ui__meter');
        meter.setAttribute('role', 'progressbar');
        meter.setAttribute('aria-valuemin', '0');
        meter.setAttribute('aria-valuemax', String(view.totalSteps));
        meter.setAttribute('aria-valuenow', String(view.completedSteps));
        const fill = el('span', 'ss-campaign-ui__fill');
        fill.style.width = (view.totalSteps ? view.completedSteps / view.totalSteps * 100 : 0) + '%';
        meter.appendChild(fill);
        progress.appendChild(meter);
        progress.appendChild(el('span', 'ss-campaign-ui__count', view.completedSteps + ' / ' + view.totalSteps));
        card.appendChild(progress);
        if (!collapsed) {
          const list = el('ul', 'ss-campaign-ui__steps');
          view.steps.forEach(step => {
            const item = el('li', 'ss-campaign-ui__step' + (step.complete ? ' is-complete' : ''));
            const mark = el('span', 'ss-campaign-ui__mark', step.complete ? '✓' : '○');
            mark.setAttribute('aria-hidden', 'true');
            const copy = el('span', 'ss-campaign-ui__step-copy');
            copy.appendChild(el('strong', 'ss-campaign-ui__step-title', step.title));
            copy.appendChild(el('small', 'ss-campaign-ui__step-description', step.description));
            if (step.requiredCount > 1) copy.appendChild(el('small', 'ss-campaign-ui__step-count', step.count + ' of ' + step.requiredCount));
            item.appendChild(mark); item.appendChild(copy); list.appendChild(item);
          });
          card.appendChild(list);
        }
      }
      host.appendChild(card);
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      while (host.firstChild) host.removeChild(host.firstChild);
      host.classList.remove('is-active');
    }
    render();
    return Object.freeze({ render: render, destroy: destroy });
  }
  root.SemesterCampaignUI = Object.freeze({ create: create });
})(typeof window !== 'undefined' ? window : globalThis);
