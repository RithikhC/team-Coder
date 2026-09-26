/* Browse filters: keyword search + category chips. */
(function (App) {
  'use strict';

  function terms(query) {
    return query.toLowerCase().split(/\s+/).filter(Boolean);
  }

  function matches(listing, state) {
    if (state.category !== 'all' && listing.category !== state.category) return false;

    const words = terms(state.query);
    if (!words.length) return true;

    const haystack = [
      listing.title,
      listing.description,
      App.getCategory(listing.category).label,
    ].join(' ').toLowerCase();
    return words.every((w) => haystack.includes(w));
  }

  function apply(listings, state) {
    return listings.filter((l) => matches(l, state));
  }

  function renderChips(container, listings, state) {
    const counts = listings.reduce((acc, l) => {
      acc[l.category] = (acc[l.category] || 0) + 1;
      return acc;
    }, {});

    const chip = (id, label, icon, count) => `
      <button type="button" class="chip" data-category="${id}" aria-pressed="${state.category === id}">
        ${icon ? `<span aria-hidden="true">${icon}</span>` : ''}${App.view.escapeHtml(label)}
        <span class="chip-count">${count}</span>
      </button>`;

    container.innerHTML = [
      chip('all', 'All', '', listings.length),
      ...App.CATEGORIES
        .filter((c) => counts[c.id] || state.category === c.id)
        .map((c) => chip(c.id, c.label, c.icon, counts[c.id] || 0)),
    ].join('');
  }

  function init({ search, chips, state, onChange }) {
    let debounce;
    search.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        state.query = search.value.trim();
        onChange();
      }, 120);
    });

    search.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && search.value) {
        search.value = '';
        state.query = '';
        onChange();
      }
    });

    chips.addEventListener('click', (event) => {
      const button = event.target.closest('[data-category]');
      if (!button) return;
      const id = button.dataset.category;
      state.category = state.category === id ? 'all' : id;
      onChange();
      chips.querySelector(`[data-category="${id}"]`)?.focus();
    });

    // "/" jumps to search from anywhere that isn't already a text field.
    document.addEventListener('keydown', (event) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey) return;
      if (event.target.closest('input, textarea, select, [contenteditable]')) return;
      event.preventDefault();
      search.focus();
    });
  }

  App.filters = { apply, renderChips, init, terms };
})(window.App = window.App || {});
