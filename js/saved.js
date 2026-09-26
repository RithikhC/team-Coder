/* Saved listings ("watchlist"): a set of listing ids persisted to localStorage. */
(function (App) {
  'use strict';

  const STORAGE_KEY = 'listit.saved.v1';
  const listeners = new Set();

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  const ids = new Set(load());

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch { /* best effort */ }
  }

  App.saved = {
    has: (id) => ids.has(id),

    toggle(id) {
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      persist();
      listeners.forEach((fn) => fn());
      return ids.has(id);
    },

    count: (listings) => listings.reduce((n, l) => n + (ids.has(l.id) ? 1 : 0), 0),

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
})(window.App = window.App || {});
