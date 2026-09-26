/* Listing detail view in a native <dialog>, with the price quoted in several currencies. */
(function (App) {
  'use strict';

  const QUOTE_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF'];
  const MAX_QUOTES = 6;

  let dialog;
  let body;
  let currentId = null;
  let quoteSeq = 0;

  function quoteTargets(listing) {
    return [...new Set([App.pricing.display, ...QUOTE_CURRENCIES])]
      .filter((code) => code !== listing.currency)
      .slice(0, MAX_QUOTES);
  }

  function render(listing) {
    const { escapeHtml, formatMoney, timeAgo } = App.view;
    const cat = App.getCategory(listing.category);
    const targets = quoteTargets(listing);

    body.innerHTML = `
      <div class="detail-hero" style="--hue:${cat.hue}">
        <span aria-hidden="true">${cat.icon}</span>
        <button type="button" class="dialog-close" data-action="close" aria-label="Back to the board">✕</button>
      </div>
      <div class="detail-content">
        <span class="card-cat" style="--hue:${cat.hue}">${escapeHtml(cat.label)}</span>
        <h2 class="detail-title" id="detail-title">${escapeHtml(listing.title)}</h2>
        ${listing.description ? `<p class="detail-desc">${escapeHtml(listing.description)}</p>` : ''}

        <div class="detail-price">
          <span class="price">${formatMoney(listing.price, listing.currency)}</span>
          <span class="detail-meta">asked in ${listing.currency} · hoisted ${timeAgo(listing.createdAt)}</span>
        </div>

        <section class="detail-section" aria-labelledby="fx-heading">
          <h3 id="fx-heading">In foreign coin</h3>
          <ul class="fx-list" id="fx-list">
            ${targets.map(() => '<li class="skeleton"></li>').join('')}
          </ul>
          <p class="fx-note" id="fx-note"></p>
        </section>

        <div class="dialog-actions" id="detail-actions">
          <button type="button" class="btn btn-ghost" data-action="close">Back to the board</button>
        </div>
      </div>`;
  }

  async function loadQuotes(listing) {
    const mine = ++quoteSeq;
    const list = body.querySelector('#fx-list');
    const note = body.querySelector('#fx-note');
    const targets = quoteTargets(listing);

    try {
      const data = await App.currency.quote(listing.price, listing.currency, targets);
      if (mine !== quoteSeq) return;
      list.innerHTML = targets
        .filter((code) => data.rates[code] != null)
        .map((code) => `
          <li class="fx-item${code === App.pricing.display ? ' is-display' : ''}">
            <span class="fx-code">${code}</span>
            <span class="fx-value">${App.view.formatMoney(data.rates[code], code, { approx: true })}</span>
          </li>`)
        .join('');
      note.textContent = `Exchanged by Frankfurter at the Harbour Master’s (ECB) rates for ${data.date}.`;
    } catch {
      if (mine !== quoteSeq) return;
      list.innerHTML = '';
      note.textContent = 'The money-changer’s shut — no foreign coin quotes till the fog lifts.';
    }
  }

  function open(id) {
    const listing = App.store.get(id);
    if (!listing) return;
    currentId = id;
    render(listing);
    if (!dialog.open) dialog.showModal();
    loadQuotes(listing);
    App.detail.onOpen.forEach((fn) => fn(listing, body));
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  function init({ grid }) {
    dialog = document.getElementById('detail');
    body = document.getElementById('detail-body');

    grid.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-action="open"]');
      if (trigger) open(trigger.closest('[data-id]').dataset.id);
    });

    dialog.addEventListener('click', (event) => {
      // A click on the backdrop lands on the <dialog> element itself.
      if (event.target === dialog || event.target.closest('[data-action="close"]')) close();
    });

    dialog.addEventListener('close', () => {
      quoteSeq++;
      const id = currentId;
      currentId = null;
      // Return focus to the card that opened the dialog.
      document.querySelector(`.card[data-id="${CSS.escape(id || '')}"] .card-open`)?.focus();
    });
  }

  App.detail = {
    init,
    open,
    close,
    onOpen: [], // hooks for extra sections (history chart, actions…)
    get currentId() { return currentId; },
  };
})(window.App = window.App || {});
