/* Browse filters: keyword search, category chips, saved-only, price range and sorting. */
(function (App) {
  'use strict';

  const SORT_MODES = ['newest', 'oldest', 'price-asc', 'price-desc'];

  const DEFAULTS = Object.freeze({
    query: '', category: 'all', sort: 'newest', saved: false, min: null, max: null,
  });

  function terms(query) {
    return query.toLowerCase().split(/\s+/).filter(Boolean);
  }

  function isFiltered(state) {
    return Boolean(state.query || state.category !== 'all' || state.saved || state.min !== null || state.max !== null);
  }

  /** Price bounds are in the viewer's display currency, compared against converted prices. */
  function inPriceRange(listing, state, valueOf) {
    if (state.min === null && state.max === null) return true;
    const value = valueOf(listing);
    if (value === null) return true; // can't convert yet, so don't hide it
    if (state.min !== null && value < state.min) return false;
    if (state.max !== null && value > state.max) return false;
    return true;
  }

  function matches(listing, state, valueOf) {
    if (state.category !== 'all' && listing.category !== state.category) return false;
    if (state.saved && !App.saved.has(listing.id)) return false;
    if (!inPriceRange(listing, state, valueOf)) return false;

    const words = terms(state.query);
    if (!words.length) return true;

    const haystack = [
      listing.title,
      listing.description,
      App.getCategory(listing.category).label,
    ].join(' ').toLowerCase();
    return words.every((w) => haystack.includes(w));
  }

  function apply(listings, state, valueOf) {
    return listings.filter((l) => matches(l, state, valueOf));
  }

  const SORTERS = {
    newest: (a, b) => b.createdAt - a.createdAt,
    oldest: (a, b) => a.createdAt - b.createdAt,
  };

  /**
   * Price sorts compare the *converted* value, so €180 and £150 are ranked fairly.
   * Listings whose price can't be converted yet always go last.
   */
  function sort(listings, mode, valueOf) {
    if (SORTERS[mode]) return listings.slice().sort(SORTERS[mode]);

    const dir = mode === 'price-desc' ? -1 : 1;
    return listings
      .map((listing) => ({ listing, value: valueOf(listing) }))
      .sort((a, b) => {
        if (a.value === null || b.value === null) return (a.value === null) - (b.value === null);
        return (a.value - b.value) * dir;
      })
      .map((entry) => entry.listing);
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

    const savedCount = App.saved.count(listings);
    const savedChip = savedCount || state.saved
      ? `<button type="button" class="chip chip-saved" data-filter="saved" aria-pressed="${state.saved}">
           <span aria-hidden="true">♥</span>Saved <span class="chip-count">${savedCount}</span>
         </button><span class="chip-divider" aria-hidden="true"></span>`
      : '';

    container.innerHTML = [
      savedChip,
      chip('all', 'All', '', listings.length),
      ...App.CATEGORIES
        .filter((c) => counts[c.id] || state.category === c.id)
        .map((c) => chip(c.id, c.label, c.icon, counts[c.id] || 0)),
    ].join('');
  }

  const parseBound = (value) => {
    if (value === null || String(value).trim() === '') return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  /* ---------- URL <-> state (so filtered views can be bookmarked and shared) ---------- */

  function readHash(state) {
    const p = new URLSearchParams(location.hash.slice(1));
    state.query = (p.get('q') || '').trim();
    state.category = App.isCategory(p.get('cat')) ? p.get('cat') : 'all';
    state.sort = SORT_MODES.includes(p.get('sort')) ? p.get('sort') : DEFAULTS.sort;
    state.saved = p.get('saved') === '1';
    state.min = parseBound(p.get('min'));
    state.max = parseBound(p.get('max'));
  }

  function writeHash(state) {
    const p = new URLSearchParams();
    if (state.query) p.set('q', state.query);
    if (state.category !== 'all') p.set('cat', state.category);
    if (state.sort !== DEFAULTS.sort) p.set('sort', state.sort);
    if (state.saved) p.set('saved', '1');
    if (state.min !== null) p.set('min', state.min);
    if (state.max !== null) p.set('max', state.max);

    const hash = p.toString();
    if (hash === location.hash.slice(1)) return;
    history.replaceState(null, '', hash ? `#${hash}` : location.pathname + location.search);
  }

  /* ---------- Controls ---------- */

  let controls = null;

  function syncControls(state) {
    const { search, sortSelect, minInput, maxInput } = controls;
    if (search.value.trim() !== state.query) search.value = state.query;
    sortSelect.value = state.sort;
    if (parseBound(minInput.value) !== state.min) minInput.value = state.min ?? '';
    if (parseBound(maxInput.value) !== state.max) maxInput.value = state.max ?? '';
  }

  function reset(state) {
    Object.assign(state, DEFAULTS);
    syncControls(state);
  }

  function init({ search, chips, sortSelect, minInput, maxInput, state, onChange }) {
    controls = { search, sortSelect, minInput, maxInput };
    readHash(state);
    syncControls(state);

    window.addEventListener('hashchange', () => {
      readHash(state);
      syncControls(state);
      onChange();
    });

    sortSelect.addEventListener('change', () => {
      state.sort = sortSelect.value;
      onChange();
    });

    let debounce;
    const later = (fn) => {
      clearTimeout(debounce);
      debounce = setTimeout(fn, 150);
    };

    search.addEventListener('input', () => later(() => {
      state.query = search.value.trim();
      onChange();
    }));

    search.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && search.value) {
        search.value = '';
        state.query = '';
        onChange();
      }
    });

    [minInput, maxInput].forEach((input) => {
      input.addEventListener('input', () => later(() => {
        state.min = parseBound(minInput.value);
        state.max = parseBound(maxInput.value);
        onChange();
      }));
    });

    chips.addEventListener('click', (event) => {
      if (event.target.closest('[data-filter="saved"]')) {
        state.saved = !state.saved;
        onChange();
        chips.querySelector('[data-filter="saved"]')?.focus();
        return;
      }

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

  App.filters = { apply, sort, renderChips, init, reset, terms, isFiltered, writeHash };
})(window.App = window.App || {});
