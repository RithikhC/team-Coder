/* App bootstrap: owns UI state and wires the modules together. */
(function (App) {
  'use strict';

  const state = App.state = { query: '', category: 'all', sort: 'newest' };

  const els = {
    grid: document.getElementById('listings'),
    count: document.getElementById('result-count'),
    empty: document.getElementById('empty-state'),
    search: document.getElementById('search'),
    chips: document.getElementById('category-chips'),
  };

  function describeResults(shown, total) {
    const noun = total === 1 ? 'listing' : 'listings';
    if (shown === total) return `${total} ${noun}`;
    const parts = [`${shown} of ${total} ${noun}`];
    if (state.category !== 'all') parts.push(`in ${App.getCategory(state.category).label}`);
    if (state.query) parts.push(`matching “${state.query}”`);
    return parts.join(' ');
  }

  function refresh() {
    const all = App.store.all();
    const visible = App.filters.sort(App.filters.apply(all, state), state.sort, App.pricing.valueOf);

    App.view.renderGrid(els.grid, visible, state.query, App.pricing.context());
    App.filters.renderChips(els.chips, all, state);
    els.empty.hidden = visible.length > 0;
    els.count.textContent = describeResults(visible.length, all.length);
  }

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
    state,
    onChange: refresh,
  });
  App.store.subscribe(refresh);
  refresh();
})(window.App = window.App || {});
