/* App bootstrap: owns UI state and wires the modules together. */
(function (App) {
  'use strict';

  const state = App.state = { query: '', category: 'all' };

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
    const visible = App.filters.apply(all, state);

    App.view.renderGrid(els.grid, visible, state.query);
    App.filters.renderChips(els.chips, all, state);
    els.empty.hidden = visible.length > 0;
    els.count.textContent = describeResults(visible.length, all.length);
  }

  App.form.init(document.getElementById('listing-form'), document.getElementById('form-status'));
  App.filters.init({ search: els.search, chips: els.chips, state, onChange: refresh });
  App.store.subscribe(refresh);
  refresh();
})(window.App = window.App || {});
