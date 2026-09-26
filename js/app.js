/* App bootstrap: owns UI state and wires the modules together. */
(function (App) {
  'use strict';

  const state = App.state = { query: '', category: 'all', sort: 'newest', saved: false };

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
    if (state.saved) parts.push('saved');
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
  App.detail.init({ grid: els.grid });

  els.grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="save"]');
    if (!button) return;
    const id = button.closest('[data-id]').dataset.id;
    const saved = App.saved.toggle(id);
    // Re-rendering replaced the button; keep keyboard focus on the new one.
    els.grid.querySelector(`[data-id="${CSS.escape(id)}"] [data-action="save"]`)?.focus();
    if (saved) App.toast('Saved — find it under ♥ Saved.', { timeout: 2500 });
  });

  App.saved.subscribe(refresh);
  App.store.subscribe(refresh);
  refresh();
})(window.App = window.App || {});
