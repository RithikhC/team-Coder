/* Display-currency controller: the viewer picks a currency and every listing price is
   converted into it using live Frankfurter rates. */
(function (App) {
  'use strict';

  const PREF_KEY = 'listit.displayCurrency';

  // Best-effort default from the browser locale's region (e.g. en-IN -> INR).
  const REGION_CURRENCY = {
    US: 'USD', GB: 'GBP', IN: 'INR', JP: 'JPY', CA: 'CAD', AU: 'AUD', NZ: 'NZD', CH: 'CHF',
    CN: 'CNY', HK: 'HKD', SG: 'SGD', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK',
    HU: 'HUF', TR: 'TRY', BR: 'BRL', MX: 'MXN', ZA: 'ZAR', KR: 'KRW', IL: 'ILS', TH: 'THB',
    PH: 'PHP', MY: 'MYR', ID: 'IDR', RO: 'RON', IS: 'ISK',
    DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', IE: 'EUR', AT: 'EUR', BE: 'EUR',
    FI: 'EUR', PT: 'EUR', GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR',
  };

  const state = { display: 'USD', table: null, status: 'loading', error: null };
  let els = {};
  let onChange = () => {};

  function guessCurrency() {
    try {
      const saved = localStorage.getItem(PREF_KEY);
      if (saved) return saved;
    } catch { /* ignore */ }
    const region = (navigator.language || '').split('-')[1]?.toUpperCase();
    return REGION_CURRENCY[region] || 'USD';
  }

  function savePreference(code) {
    try { localStorage.setItem(PREF_KEY, code); } catch { /* ignore */ }
  }

  function formatRateDate(isoDate) {
    return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  function renderStatus() {
    const { statusEl } = els;
    statusEl.dataset.state = state.status;

    if (state.status === 'loading') {
      statusEl.innerHTML = '<span class="spinner" aria-hidden="true"></span> Sendin’ a parrot to the money-changer…';
    } else if (state.status === 'error') {
      statusEl.innerHTML = `The money-changer’s ship be lost at sea (Frankfurter unreachable) — showin’ each seller’s own coin.
        <button type="button" class="btn-link" data-action="retry-rates">Try again</button>`;
    } else {
      const date = formatRateDate(state.table.date);
      statusEl.innerHTML = state.status === 'stale'
        ? `Stranded offshore — countin’ in <strong>${state.display}</strong> with rates from ${date}.
           <button type="button" class="btn-link" data-action="retry-rates">Refresh</button>`
        : `Coin counted in <strong>${state.display}</strong> · Harbour Master’s (ECB) rates for ${date}, ferried by
           <a href="https://frankfurter.dev" target="_blank" rel="noopener">Frankfurter</a>`;
    }
  }

  async function load() {
    const requested = state.display;
    state.status = 'loading';
    renderStatus();

    try {
      const table = await App.currency.rates(requested);
      if (requested !== state.display) return; // user switched again while we were waiting
      state.table = table;
      state.status = table.stale ? 'stale' : 'ready';
    } catch (err) {
      if (requested !== state.display) return;
      console.warn('Exchange rates unavailable:', err);
      state.table = null;
      state.status = 'error';
    }
    renderStatus();
    onChange();
  }

  function fillSelect(list) {
    const { select } = els;
    select.innerHTML = '';
    Object.keys(list).sort().forEach((code) => {
      select.add(new Option(`${code} — ${list[code]}`, code));
    });
    if (!list[state.display]) state.display = 'USD';
    select.value = state.display;
  }

  function setDisplay(code) {
    if (code === state.display) return;
    state.display = code;
    state.table = null; // never mix a stale base with the new one
    savePreference(code);
    onChange();
    load();
  }

  /** Pricing context for the view, or null while rates are unavailable. */
  function context() {
    return state.table && state.table.base === state.display
      ? { display: state.display, table: state.table }
      : null;
  }

  /** A listing's price in the display currency, or null if it can't be converted yet. */
  function valueOf(listing) {
    if (listing.currency === state.display) return listing.price;
    const ctx = context();
    return ctx ? App.currency.toBase(ctx.table, listing.price, listing.currency) : null;
  }

  function init(options) {
    els = { select: options.select, statusEl: options.statusEl };
    onChange = options.onChange;
    state.display = guessCurrency();

    fillSelect(App.currency.FALLBACK_CURRENCIES);
    App.currency.currencies().then(fillSelect);

    els.select.addEventListener('change', () => setDisplay(els.select.value));
    els.statusEl.addEventListener('click', (event) => {
      if (event.target.closest('[data-action="retry-rates"]')) load();
    });

    load();
  }

  App.pricing = { init, context, valueOf, get display() { return state.display; } };
})(window.App = window.App || {});
