/* The plunder bag (cart): stow loot, see a single total in yer own coin across every
   seller's currency, then settle up with the Quartermaster. */
(function (App) {
  'use strict';

  const STORAGE_KEY = 'plunderport.bag.v1';
  const TOTAL_ALSO_IN = ['USD', 'EUR', 'GBP', 'INR'];
  const listeners = new Set();

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  // Each entry: { id, price, currency, haggled } — price is what the buyer will pay,
  // in the listing's own currency (lower than the ask if they haggled).
  let entries = load();

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* best effort */ }
  }

  function emit() {
    persist();
    listeners.forEach((fn) => fn());
  }

  const bag = {
    /** Entries joined with their live listing; loot deleted from the board drops out. */
    items() {
      return entries
        .map((e) => ({ ...e, listing: App.store.get(e.id) }))
        .filter((e) => e.listing);
    },
    has: (id) => entries.some((e) => e.id === id),
    count() { return this.items().length; },

    add(listing, dealPrice = null) {
      const entry = {
        id: listing.id,
        price: dealPrice ?? listing.price,
        currency: listing.currency,
        haggled: dealPrice !== null && dealPrice < listing.price,
      };
      entries = [...entries.filter((e) => e.id !== listing.id), entry];
      emit();
    },

    remove(id) {
      entries = entries.filter((e) => e.id !== id);
      emit();
    },

    clear() {
      entries = [];
      emit();
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };

  /* ---------- Flying coin (Web Animations API) ---------- */

  /** `a` is the start rect, captured before any re-render detaches the clicked button. */
  function flyCoin(a, to) {
    if (!a || !to || matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
    const b = to.getBoundingClientRect();
    const coin = document.createElement('span');
    coin.className = 'flying-coin';
    coin.textContent = '🪙';
    coin.setAttribute('aria-hidden', 'true');
    coin.style.left = `${a.left + a.width / 2}px`;
    coin.style.top = `${a.top + a.height / 2}px`;
    (document.querySelector('dialog[open]') || document.body).append(coin);

    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const animation = coin.animate([
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 120}px)) scale(1.5) rotate(180deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.4) rotate(360deg)`, opacity: 0.2 },
    ], { duration: 700, easing: 'cubic-bezier(.4, 0, .2, 1)' });
    return animation.finished.then(() => coin.remove(), () => coin.remove());
  }

  /* ---------- Drawer UI ---------- */

  let drawer;
  let button;
  let countEl;
  let quoteSeq = 0;

  function bump() {
    countEl.classList.remove('bump');
    void countEl.offsetWidth; // restart the animation
    countEl.classList.add('bump');
  }

  function stow(listing, origin, dealPrice = null) {
    const wasEmpty = !bag.has(listing.id);
    const from = origin?.getBoundingClientRect();
    bag.add(listing, dealPrice);
    App.fx.play('coins');
    flyCoin(from, button).then(bump);
    if (wasEmpty || dealPrice !== null) {
      App.toast(`Stowed “${listing.title}” in yer plunder bag.`, {
        timeout: 3000,
        action: { label: 'Open bag', onClick: open },
      });
    }
  }

  function toggle(listing, origin) {
    if (bag.has(listing.id)) {
      bag.remove(listing.id);
      App.fx.play('tick');
    } else {
      stow(listing, origin);
    }
  }

  function convert(entry, pricing) {
    if (pricing && entry.currency === pricing.display) return entry.price;
    return pricing ? App.currency.toBase(pricing.table, entry.price, entry.currency) : null;
  }

  function render() {
    const { escapeHtml, formatMoney, mediaHtml } = App.view;
    const items = bag.items();
    const pricing = App.pricing.context();
    const display = App.pricing.display;
    const body = drawer.querySelector('#bag-body');

    if (!items.length) {
      body.innerHTML = `
        <div class="bag-empty">
          <p class="bag-empty-icon" aria-hidden="true">🧺</p>
          <p><strong>Yer bag be empty.</strong></p>
          <p>Tap the 🪙 on any loot to stow it here — or haggle with a seller first.</p>
        </div>`;
      return;
    }

    let total = 0;
    let saved = 0;
    let convertible = true;
    const rows = items.map((e) => {
      const value = convert(e, pricing);
      if (value === null) convertible = false;
      else total += value;
      if (e.haggled) saved += (convert({ ...e, price: e.listing.price }, pricing) ?? 0) - (value ?? 0);

      return `
        <li class="bag-item" data-id="${escapeHtml(e.id)}">
          <div class="bag-thumb" style="--hue:${App.getCategory(e.listing.category).hue}">${mediaHtml(e.listing)}</div>
          <div class="bag-info">
            <strong>${escapeHtml(e.listing.title)}</strong>
            <span>${formatMoney(e.price, e.currency)}${e.haggled ? ` <s>${formatMoney(e.listing.price, e.currency)}</s> <em class="deal-tag">haggled</em>` : ''}</span>
          </div>
          <span class="bag-price">${value !== null && e.currency !== display ? `≈ ${formatMoney(value, display, { approx: true })}` : ''}</span>
          <button type="button" class="bag-remove" data-action="bag-remove" aria-label="Toss ${escapeHtml(e.listing.title)} out of the bag">✕</button>
        </li>`;
    }).join('');

    const ports = new Set(items.map((e) => e.currency)).size;
    body.innerHTML = `
      <ul class="bag-list">${rows}</ul>
      <div class="bag-summary">
        ${convertible ? `
          <p class="bag-total"><span>Total</span> <strong>${formatMoney(total, display)}</strong></p>
          <p class="bag-also" id="bag-also"></p>
          ${saved > 0.005 ? `<p class="bag-saved">🦜 Ye saved <strong>${formatMoney(saved, display)}</strong> by hagglin’!</p>` : ''}
          <p class="bag-note">${items.length} piece${items.length === 1 ? '' : 's'} from ${ports} port${ports === 1 ? '' : 's'}, totalled in ${display} at the Harbour Master’s rates.</p>`
        : '<p class="bag-note">No exchange rates right now — can’t total mixed coins. Try again when the fog lifts.</p>'}
        <button type="button" class="btn btn-primary btn-block" data-action="checkout" ${convertible ? '' : 'disabled'}>
          Settle up with the Quartermaster
        </button>
      </div>`;

    if (convertible) loadAlso(total, display);
  }

  async function loadAlso(total, display) {
    const mine = ++quoteSeq;
    const targets = TOTAL_ALSO_IN.filter((c) => c !== display).slice(0, 3);
    try {
      const data = await App.currency.quote(Math.round(total * 100) / 100, display, targets);
      const el = drawer.querySelector('#bag-also');
      if (mine !== quoteSeq || !el) return;
      el.textContent = 'or ' + targets
        .filter((c) => data.rates[c] != null)
        .map((c) => App.view.formatMoney(data.rates[c], c, { approx: true }))
        .join(' · ');
    } catch { /* optional extra — ignore */ }
  }

  function checkout(trigger) {
    const items = bag.items();
    const pricing = App.pricing.context();
    const display = App.pricing.display;
    const total = items.reduce((sum, e) => sum + (convert(e, pricing) ?? 0), 0);

    App.fx.celebrate(trigger, 'fanfare', 120);
    bag.clear();
    drawer.querySelector('#bag-body').innerHTML = `
      <div class="bag-receipt" tabindex="-1">
        <p class="receipt-seal" aria-hidden="true">✔</p>
        <h3>Paid in full!</h3>
        <p>${items.length} piece${items.length === 1 ? '' : 's'} o’ loot for <strong>${App.view.formatMoney(total, display)}</strong>.</p>
        <p class="bag-note">The Quartermaster bites every coin, nods, and hands ye a receipt stamped with a skull. Fair winds!</p>
        <button type="button" class="btn btn-ghost btn-block" data-action="bag-close">Back to the board</button>
      </div>`;
    drawer.querySelector('.bag-receipt').focus();
  }

  function open() {
    render();
    if (!drawer.open) drawer.showModal();
  }

  function updateCount() {
    const n = bag.count();
    countEl.textContent = n;
    countEl.hidden = n === 0;
    button.setAttribute('aria-label', `Open plunder bag (${n} item${n === 1 ? '' : 's'})`);
    if (drawer.open && !drawer.querySelector('.bag-receipt')) render();

    // Keep the detail dialog's button honest when loot is stowed from elsewhere (e.g. a haggled deal).
    const detailButton = document.querySelector('#detail [data-action="bag-toggle"]');
    if (detailButton && App.detail.currentId) {
      const inBag = bag.has(App.detail.currentId);
      detailButton.setAttribute('aria-pressed', String(inBag));
      detailButton.textContent = inBag ? '✓ In yer bag' : '🪙 Stow in bag';
    }
  }

  function init() {
    drawer = document.getElementById('bag');
    button = document.getElementById('bag-button');
    countEl = document.getElementById('bag-count');

    button.addEventListener('click', open);
    drawer.addEventListener('click', (event) => {
      if (event.target === drawer || event.target.closest('[data-action="bag-close"]')) {
        drawer.close();
        return;
      }
      const remove = event.target.closest('[data-action="bag-remove"]');
      if (remove) {
        bag.remove(remove.closest('[data-id]').dataset.id);
        App.fx.play('tick');
      }
      const pay = event.target.closest('[data-action="checkout"]');
      if (pay) checkout(pay);
    });

    // "Stow in bag" in the detail dialog.
    App.detail.onOpen.push((listing, body) => {
      body.querySelector('#detail-actions').insertAdjacentHTML('beforeend', `
        <button type="button" class="btn btn-primary" data-action="bag-toggle" aria-pressed="${bag.has(listing.id)}">
          ${bag.has(listing.id) ? '✓ In yer bag' : '🪙 Stow in bag'}
        </button>`);
    });
    document.getElementById('detail').addEventListener('click', (event) => {
      const btn = event.target.closest('[data-action="bag-toggle"]');
      if (!btn) return;
      const listing = App.store.get(App.detail.currentId);
      toggle(listing, btn);
      btn.setAttribute('aria-pressed', String(bag.has(listing.id)));
      btn.textContent = bag.has(listing.id) ? '✓ In yer bag' : '🪙 Stow in bag';
    });

    bag.subscribe(updateCount);
    App.store.subscribe(updateCount);
    updateCount();
  }

  App.bag = Object.assign(bag, { init, open, toggle, stow, sync: () => drawer && updateCount() });
})(window.App = window.App || {});
