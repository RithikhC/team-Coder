/* App bootstrap: owns UI state and wires the modules together. */
(function (App) {
  'use strict';

  const state = App.state = {
    query: '', category: 'all', sort: 'newest', saved: false, min: null, max: null,
  };

  const els = {
    grid: document.getElementById('listings'),
    count: document.getElementById('result-count'),
    empty: document.getElementById('empty-state'),
    search: document.getElementById('search'),
    chips: document.getElementById('category-chips'),
    rangeCurrency: document.getElementById('range-currency'),
    notice: document.getElementById('harbour-notice'),
  };

  function harbourNotice(all) {
    if (!all.length) return 'The board be bare. Stash the first piece o’ loot!';
    const ports = new Set(all.map((l) => l.currency)).size;
    const newest = all.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
    return `${all.length} pieces o’ loot from ${ports} port${ports === 1 ? '' : 's'} o’ call. `
      + `Freshest plunder: “${newest.title}”.`;
  }

  function describeResults(shown, total) {
    const noun = total === 1 ? 'piece o’ loot' : 'pieces o’ loot';
    if (!App.filters.isFiltered(state)) return `${total} ${noun}`;

    const { formatMoney } = App.view;
    const cur = App.pricing.display;
    const parts = [`${shown} of ${total} ${noun}`];
    if (state.saved) parts.push('coveted');
    if (state.category !== 'all') parts.push(`in ${App.getCategory(state.category).label}`);
    if (state.query) parts.push(`matching “${state.query}”`);
    if (state.min !== null && state.max !== null) parts.push(`between ${formatMoney(state.min, cur)} and ${formatMoney(state.max, cur)}`);
    else if (state.min !== null) parts.push(`from ${formatMoney(state.min, cur)}`);
    else if (state.max !== null) parts.push(`up to ${formatMoney(state.max, cur)}`);
    return parts.join(' ');
  }

  function refresh() {
    const all = App.store.all();
    const valueOf = App.pricing.valueOf;
    const visible = App.filters.sort(App.filters.apply(all, state, valueOf), state.sort, valueOf);

    App.view.renderGrid(els.grid, visible, state.query, App.pricing.context());
    App.filters.renderChips(els.chips, all, state);
    App.filters.writeHash(state);
    els.rangeCurrency.textContent = App.pricing.display;
    els.notice.textContent = harbourNotice(all);
    els.empty.hidden = visible.length > 0;
    els.count.textContent = describeResults(visible.length, all.length);
  }

  App.theme.init(document.getElementById('theme-toggle'));
  App.pricing.init({
    select: document.getElementById('display-currency'),
    statusEl: document.getElementById('rates-status'),
    onChange: () => {
      App.form.suggestCurrency(App.pricing.display);
      refresh();
    },
  });
  App.form.init(document.getElementById('listing-form'), document.getElementById('form-status'));
  App.form.suggestCurrency(App.pricing.display);
  App.filters.init({
    search: els.search,
    chips: els.chips,
    sortSelect: document.getElementById('sort'),
    minInput: document.getElementById('min-price'),
    maxInput: document.getElementById('max-price'),
    state,
    onChange: refresh,
  });
  App.detail.init({ grid: els.grid });

  els.grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="save"]');
    if (!button) return;
    const id = button.closest('[data-id]').dataset.id;
    const saved = App.saved.toggle(id);
    // Re-rendering replaced the button; keep keyboard focus on the new one.
    els.grid.querySelector(`[data-id="${CSS.escape(id)}"] [data-action="save"]`)?.focus();
    if (saved) App.toast('Coveted! Find it under ♥ Coveted.', { timeout: 2500 });
  });

  els.empty.addEventListener('click', (event) => {
    if (!event.target.closest('[data-action="clear-filters"]')) return;
    App.filters.reset(state);
    refresh();
    els.search.focus();
  });

  App.saved.subscribe(refresh);
  App.store.subscribe(refresh);
  refresh();
})(window.App = window.App || {});
