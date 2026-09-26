/* First-voyage guided tour (spotlight + tooltip) and keyboard shortcuts. */
(function (App) {
  'use strict';

  const TOURED_KEY = 'plunderport.toured';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const STEPS = [
    { target: '.brand', title: 'Ahoy, welcome to Plunder Port!',
      text: 'A pirate loot exchange where every price converts live between 30 currencies. Let me show ye the ropes - takes 30 seconds.' },
    { target: '#display-currency', title: 'Count yer coin',
      text: 'Pick yer currency and every price on the board converts instantly, using live ECB rates from the Frankfurter API.' },
    { target: '.post-panel', title: 'Stash yer loot',
      text: 'Post loot in any currency - with a picture (drag, drop or paste). A live preview shows what pirates in far ports will pay.' },
    { target: '.toolbar', title: 'Spy the board',
      text: 'Search, set a bounty range in yer own coin, and sort by converted price. Filters live in the URL, so ye can share the exact view.' },
    { target: '#spin-button', title: 'Feelin’ lucky?',
      text: 'Spin the ship’s wheel and fate picks a piece o’ loot for ye.' },
    { target: '.grid .card', title: 'Open any loot',
      text: 'See its price in six currencies and a 30-day price chart - then haggle with the captain! ♥ to covet it, 🪙 to stow it in yer bag.' },
    { target: '#bag-button', title: 'Yer plunder bag',
      text: 'Mixed coins from every port, totalled in yours. Settle up with the Quartermaster for a fanfare.' },
    { target: '#sound-toggle', title: 'Bells & lanterns',
      text: 'Toggle sounds and night-watch mode here. Press ? any time for keyboard shortcuts. Fair winds!' },
  ];

  let root = null;
  let index = 0;
  let previousFocus = null;

  function build() {
    root = document.createElement('div');
    root.className = 'tour';
    root.innerHTML = `
      <div class="tour-spotlight" aria-hidden="true"></div>
      <div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-text">
        <p class="tour-step" aria-hidden="true"></p>
        <h2 id="tour-title"></h2>
        <p id="tour-text"></p>
        <div class="tour-actions">
          <button type="button" class="btn-link" data-tour="skip">Skip tour</button>
          <span class="spacer"></span>
          <button type="button" class="btn btn-ghost" data-tour="back">Back</button>
          <button type="button" class="btn btn-primary" data-tour="next">Next</button>
        </div>
      </div>`;
    document.body.append(root);

    root.addEventListener('click', (event) => {
      const action = event.target.closest('[data-tour]')?.dataset.tour;
      if (action === 'next') go(index + 1);
      if (action === 'back') go(index - 1);
      if (action === 'skip') end();
    });
    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') end();
      if (event.key === 'ArrowRight') go(index + 1);
      if (event.key === 'ArrowLeft') go(index - 1);
      if (event.key === 'Tab') trapFocus(event);
    });
  }

  function trapFocus(event) {
    const focusables = [...root.querySelectorAll('button:not([disabled])')];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function place() {
    if (!root) return;
    const step = STEPS[index];
    const target = document.querySelector(step.target);
    const spot = root.querySelector('.tour-spotlight');
    const card = root.querySelector('.tour-card');
    if (!target) return;

    const pad = 8;
    const r = target.getBoundingClientRect();
    Object.assign(spot.style, {
      top: `${r.top - pad}px`, left: `${r.left - pad}px`,
      width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px`,
    });

    if (innerWidth < 640) {
      card.classList.add('is-docked');
      card.style.top = card.style.left = '';
      return;
    }
    card.classList.remove('is-docked');
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const below = r.bottom + pad + 14;
    const top = below + ch < innerHeight - 16 ? below : Math.max(16, r.top - pad - 14 - ch);
    const left = Math.min(Math.max(16, r.left + r.width / 2 - cw / 2), innerWidth - cw - 16);
    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }

  async function go(next) {
    if (next < 0) return;
    if (next >= STEPS.length) return end(true);
    index = next;

    const step = STEPS[index];
    const card = root.querySelector('.tour-card');
    root.querySelector('.tour-step').textContent = `Step ${index + 1} of ${STEPS.length}`;
    root.querySelector('#tour-title').textContent = step.title;
    root.querySelector('#tour-text').textContent = step.text;
    root.querySelector('[data-tour="back"]').disabled = index === 0;
    root.querySelector('[data-tour="next"]').textContent = index === STEPS.length - 1 ? 'Set sail!' : 'Next';

    const target = document.querySelector(step.target);
    if (target) {
      const r = target.getBoundingClientRect();
      const inStickyHeader = Boolean(target.closest('.site-header'));
      const offscreen = r.top < 80 || r.bottom > innerHeight - 40;
      if (offscreen && !inStickyHeader) {
        target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
        await wait(reduceMotion.matches ? 0 : 380);
      }
    }
    card.classList.remove('is-in');
    void card.offsetWidth;
    card.classList.add('is-in');
    place();
    setTimeout(place, 450); // settle after any smooth scroll finishes
    App.fx.play('tick');
    root.querySelector('[data-tour="next"]').focus();
  }

  function start() {
    if (root) return;
    document.querySelectorAll('dialog[open]').forEach((d) => d.close());
    previousFocus = document.activeElement;
    build();
    document.body.classList.add('is-touring');
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, { passive: true });
    window.addEventListener('scrollend', place);
    go(0);
  }

  function end(finished = false) {
    if (!root) return;
    try { localStorage.setItem(TOURED_KEY, '1'); } catch { /* ignore */ }
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place);
    window.removeEventListener('scrollend', place);
    root.remove();
    root = null;
    document.body.classList.remove('is-touring');
    if (finished) {
      App.fx.celebrate(null, 'fanfare', 80);
      App.toast('Ye know the ropes now. Happy plunderin’, captain!', { timeout: 3500 });
    }
    previousFocus?.focus?.();
  }

  /* ---------- Keyboard shortcuts ---------- */

  function initShortcuts({ help, spin, bag, theme, title }) {
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || root) return;
      if (event.target.closest('input, textarea, select, [contenteditable]')) return;

      if (event.key === '?') {
        event.preventDefault();
        if (help.open) help.close();
        else {
          document.querySelectorAll('dialog[open]').forEach((d) => d.close());
          help.showModal();
        }
        return;
      }
      if (document.querySelector('dialog[open]')) return;

      const key = event.key.toLowerCase();
      const actions = {
        s: () => spin.click(),
        b: () => bag.click(),
        t: () => theme.click(),
        n: () => { title.scrollIntoView({ behavior: 'smooth', block: 'center' }); title.focus({ preventScroll: true }); },
      };
      if (actions[key]) {
        event.preventDefault();
        actions[key]();
      }
    });

    help.addEventListener('click', (event) => {
      if (event.target === help || event.target.closest('[data-action="help-close"]')) help.close();
      if (event.target.closest('[data-action="tour"]')) {
        help.close();
        start();
      }
    });
  }

  function init(options) {
    initShortcuts(options);
    document.getElementById('help-fab').addEventListener('click', () => options.help.showModal());

    let toured = false;
    try { toured = localStorage.getItem(TOURED_KEY) === '1'; } catch { /* ignore */ }
    // Wait for the board to settle (rates, first render) before the first voyage.
    if (!toured) setTimeout(() => { if (!document.querySelector('dialog[open]')) start(); }, 1200);
  }

  App.tour = { init, start, end };
})(window.App = window.App || {});
