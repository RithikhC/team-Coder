/* Listing store: an in-memory array persisted to localStorage, with change listeners. */
(function (App) {
  'use strict';

  const STORAGE_KEY = 'listit.listings.v1';
  const HOUR = 60 * 60 * 1000;

  const SEED = [
    { title: 'MacBook Air M2, 256GB', price: 850, category: 'electronics', description: 'Barely used, battery cycle count 42. Comes with original charger and box.', age: 2 },
    { title: 'Mid-century oak coffee table', price: 180, category: 'furniture', description: 'Solid oak, minor scratches on one leg. Pickup only.', age: 5 },
    { title: '2014 Honda Civic, 92k km', price: 7400, category: 'vehicles', description: 'Single owner, full service history, new tyres last spring.', age: 9 },
    { title: 'Sony WH-1000XM4 headphones', price: 190, category: 'electronics', description: 'Noise cancelling, black. Includes carry case.', age: 20 },
    { title: 'Clean Code — Robert C. Martin', price: 18, category: 'books', description: 'Paperback, a few highlighted pages.', age: 26 },
    { title: 'North Face puffer jacket (M)', price: 95, category: 'clothing', description: 'Worn one winter, no tears.', age: 40 },
    { title: 'Monstera deliciosa, ~1 m tall', price: 35, category: 'home', description: 'Healthy and huge. Pot included.', age: 52 },
    { title: 'Adjustable dumbbells 2–24 kg', price: 210, category: 'sports', description: 'Pair, quick-dial weight selector.', age: 70 },
    { title: 'IKEA Billy bookcase, white', price: 45, category: 'furniture', description: 'Already disassembled for easy transport.', age: 96 },
  ];

  const listeners = new Set();

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function seedListings() {
    const now = Date.now();
    return SEED.map(({ age, ...rest }) => ({ id: uid(), ...rest, createdAt: now - age * HOUR }));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return seedListings();
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : seedListings();
    } catch (err) {
      console.warn('Could not read saved listings, starting fresh.', err);
      return seedListings();
    }
  }

  let listings = load();

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
    } catch (err) {
      console.warn('Could not save listings.', err);
    }
  }

  function emit() {
    listeners.forEach((fn) => fn(listings.slice()));
  }

  function normalize(input) {
    return {
      title: String(input.title).trim(),
      price: Math.round(Number(input.price) * 100) / 100,
      category: App.isCategory(input.category) ? input.category : 'other',
      description: String(input.description || '').trim(),
    };
  }

  App.store = {
    all() {
      return listings.slice();
    },

    add(input) {
      const listing = { id: uid(), ...normalize(input), createdAt: Date.now() };
      listings.unshift(listing);
      persist();
      emit();
      return listing;
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };

  persist();
})(window.App = window.App || {});
