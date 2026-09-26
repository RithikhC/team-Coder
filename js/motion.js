/* Board motion: 3D tilt-and-glare on hover, and "Spin the wheel" to pick random loot. */
(function (App) {
  'use strict';

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /* ---------- Tilt ---------- */

  function resetTilt(card) {
    card.classList.remove('is-tilting');
    ['--rx', '--ry', '--gx', '--gy'].forEach((p) => card.style.removeProperty(p));
  }

  function initTilt(grid) {
    let active = null;
    let frame = 0;

    grid.addEventListener('pointermove', (event) => {
      if (!finePointer.matches || reduceMotion.matches) return;
      const card = event.target.closest('.card');
      if (active && active !== card) resetTilt(active);
      active = card;
      if (!card) return;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const px = (event.clientX - r.left) / r.width;
        const py = (event.clientY - r.top) / r.height;
        card.style.setProperty('--ry', `${((px - 0.5) * 10).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${((0.5 - py) * 8).toFixed(2)}deg`);
        card.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
        card.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
        card.classList.add('is-tilting');
      });
    });

    grid.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      if (active) resetTilt(active);
      active = null;
    });
  }

  /* ---------- Spin the wheel ---------- */

  let spinning = false;

  async function spin(button, grid) {
    const cards = [...grid.querySelectorAll('.card')];
    if (spinning) return;
    if (!cards.length) {
      App.toast('No loot on the board to spin for, matey.');
      return;
    }

    spinning = true;
    button.classList.add('is-spinning');
    button.setAttribute('aria-busy', 'true');

    const winner = Math.floor(Math.random() * cards.length);
    // At least ~12 hops (extra laps when there are few cards), always ending on the winner.
    const steps = winner + cards.length * Math.ceil(Math.max(0, 12 - winner) / cards.length);
    let current = null;

    for (let i = 0; i <= steps; i++) {
      current?.classList.remove('is-spotlit');
      current = cards[i % cards.length];
      current.classList.add('is-spotlit');
      App.fx.play('tick');
      if (reduceMotion.matches) break;
      // Ease out: the wheel slows down as it lands.
      const progress = i / steps;
      await wait(40 + 200 * progress * progress);
    }

    current = cards[winner];
    cards.forEach((c) => c.classList.toggle('is-spotlit', c === current));
    current.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
    App.fx.celebrate(current.querySelector('.card-media'), 'coins', 40);
    await wait(700);

    current.classList.remove('is-spotlit');
    button.classList.remove('is-spinning');
    button.removeAttribute('aria-busy');
    spinning = false;
    if (current.isConnected) App.detail.open(current.dataset.id);
  }

  function init({ grid, spinButton }) {
    initTilt(grid);
    spinButton.addEventListener('click', () => spin(spinButton, grid));
  }

  App.motion = { init };
})(window.App = window.App || {});
